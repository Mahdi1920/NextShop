import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isUUID } from 'class-validator';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class CategoriesService {
	constructor(
		@InjectModel(Category.name)
		private readonly categoryModel: Model<CategoryDocument>,
		@InjectModel(Product.name)
		private readonly productModel: Model<ProductDocument>,
		private readonly notificationsService: NotificationsService,
	) {}

	private toUuid(id: string, label: string): string {
		if (!isUUID(id, '4')) {
			throw new BadRequestException(`${label} is invalid`);
		}
		return id;
	}

	private async validateParent(parentId: string | null | undefined, categoryId?: string) {
		if (!parentId) return null;
		const parentUuid = this.toUuid(parentId, 'parentId');
		if (categoryId && parentUuid === categoryId) {
			throw new BadRequestException('A category cannot be its own parent');
		}
		let ancestor = await this.categoryModel.findById(parentUuid).exec();
		if (!ancestor) throw new NotFoundException('Parent category not found');
		const visited = new Set<string>();
		while (ancestor) {
			const ancestorId = ancestor._id.toString();
			if (categoryId && ancestorId === categoryId.toString()) {
				throw new BadRequestException('A category cannot be moved under one of its descendants');
			}
			if (visited.has(ancestorId)) throw new BadRequestException('The category hierarchy contains a cycle');
			visited.add(ancestorId);
			ancestor = ancestor.parentId ? await this.categoryModel.findById(ancestor.parentId).exec() : null;
		}
		return parentUuid;
	}

	async list() {
		return this.categoryModel.find().sort({ createdAt: -1 }).exec();
	}

	async create(dto: CreateCategoryDto) {
		const name = dto.name.trim();
		const slug = (dto.slug ?? name)
			.trim()
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^a-z0-9\-]/g, '')
			.replace(/-+/g, '-');

		const exists = await this.categoryModel
			.exists({ $or: [{ name }, { slug }] })
			.exec();
		if (exists) throw new ConflictException('Category already exists');

		const category = await this.categoryModel.create({
			name,
			slug,
			description: dto.description,
			parentId: await this.validateParent(dto.parentId),
		});

		// Notify admin dashboard in real-time
		const total = await this.categoryModel.countDocuments().exec();
		this.notificationsService.emitLiveEvent({ broadcast: true }, 'category:changed', { total });

		return category;
	}

	async update(id: string, dto: UpdateCategoryDto) {
		const uuid = this.toUuid(id, 'categoryId');
		const category = await this.categoryModel.findById(uuid).exec();
		if (!category) throw new NotFoundException('Category not found');

		if (dto.name !== undefined) category.name = dto.name.trim();
		if (dto.slug !== undefined) {
			category.slug = dto.slug
				.trim()
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^a-z0-9\-]/g, '')
				.replace(/-+/g, '-');
		}
		if (dto.description !== undefined) category.description = dto.description;
		if (dto.parentId !== undefined) category.parentId = await this.validateParent(dto.parentId, uuid);

		// uniqueness check if name/slug changed
		const name = category.name;
		const slug = category.slug;
		const conflict = await this.categoryModel
			.exists({ _id: { $ne: uuid }, $or: [{ name }, { slug }] })
			.exec();
		if (conflict) throw new ConflictException('Category already exists');

		await category.save();

		// Notify admin dashboard in real-time
		const total = await this.categoryModel.countDocuments().exec();
		this.notificationsService.emitLiveEvent({ broadcast: true }, 'category:changed', { total });

		return category;
	}

	async remove(id: string) {
		const uuid = this.toUuid(id, 'categoryId');
		const existing = await this.categoryModel.findById(uuid).exec();
		if (!existing) throw new NotFoundException('Category not found');

		const inUse = await this.productModel.exists({ categoryId: uuid }).exec();
		if (inUse) {
			throw new BadRequestException('Cannot delete a category that still has products');
		}
		const hasChildren = await this.categoryModel.exists({ parentId: uuid }).exec();
		if (hasChildren) throw new BadRequestException('Cannot delete a category that still has child categories');

		await this.categoryModel.deleteOne({ _id: uuid }).exec();

		// Notify admin dashboard in real-time
		const total = await this.categoryModel.countDocuments().exec();
		this.notificationsService.emitLiveEvent({ broadcast: true }, 'category:changed', { total });

		return { ok: true };
	}
}
