import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isUUID } from 'class-validator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';
import { Category, CategoryDocument } from '../categories/schemas/category.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../common/enums/role.enum';

export type ProductListFilters = {
	search?: string;
	categoryId?: string;
	categoryIds?: string;
	brand?: string;
	color?: string;
	attributeFilters?: string;
	minPrice?: string;
	maxPrice?: string;
	sort?: string;
	page?: string;
	limit?: string;
	isActive?: string;
	inStock?: string;
	sellerId?: string;
};

type ListScope =
	| { mode: 'public' }
	| { mode: 'seller'; sellerId: string }
	| { mode: 'admin' };

@Injectable()
export class ProductsService {
	constructor(
		@InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
		@InjectModel(Category.name) private readonly categoryModel: Model<CategoryDocument>,
		private readonly notificationsService: NotificationsService,
	) {}

	private toUuid(id: string, label: string): string {
		if (!isUUID(id, '4')) {
			throw new BadRequestException(`${label} is invalid`);
		}
		return id;
	}

	private parsePage(filters: ProductListFilters) {
		const page = Math.max(1, Number.parseInt(filters.page ?? '1', 10) || 1);
		const limit = Math.min(48, Math.max(1, Number.parseInt(filters.limit ?? '12', 10) || 12));
		return { page, limit, skip: (page - 1) * limit };
	}

	private parseMultiValue(value?: string): string[] {
		return value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
	}

	private parseAttributeFilters(value?: string): Record<string, string[]> {
		if (!value) return {};
		let parsed: unknown;
		try {
			parsed = JSON.parse(value);
		} catch {
			throw new BadRequestException('Attribute filters are invalid');
		}
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new BadRequestException('Attribute filters are invalid');
		}
		const filters: Record<string, string[]> = {};
		for (const [key, rawValues] of Object.entries(parsed)) {
			if (!/^[\p{L}\p{N}_ -]{1,60}$/u.test(key)) throw new BadRequestException('Attribute name is invalid');
			const values = (Array.isArray(rawValues) ? rawValues : [rawValues])
				.filter((item): item is string => typeof item === 'string')
				.map((item) => item.trim())
				.filter(Boolean);
			if (values.length) filters[key] = values;
		}
		return filters;
	}

	private normalizeAttributes(attributes?: Record<string, string>): Record<string, string> {
		if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return {};
		const normalized: Record<string, string> = {};
		for (const [rawKey, rawValue] of Object.entries(attributes)) {
			const key = rawKey.trim();
			if (!key || !/^[\p{L}\p{N}_ -]{1,60}$/u.test(key)) {
				throw new BadRequestException('Attribute name is invalid');
			}
			if (typeof rawValue !== 'string') throw new BadRequestException('Attribute values must be text');
			const value = rawValue.trim();
			if (value) normalized[key] = value.slice(0, 120);
		}
		return normalized;
	}

	private buildQuery(filters: ProductListFilters, scope: ListScope, categoryIds?: string[]) {
		const query: Record<string, any> = {};

		if (scope.mode === 'public') {
			query.isActive = true;
			if (filters.sellerId) query.sellerId = this.toUuid(filters.sellerId, 'sellerId');
		} else if (scope.mode === 'seller') {
			query.sellerId = this.toUuid(scope.sellerId, 'sellerId');
		}

		if (filters.search?.trim()) {
			const escaped = [...filters.search.trim()]
				.map((character) => ('.*+?^${}()|[]\\'.includes(character) ? `\\${character}` : character))
				.join('');
			query.$or = [
				{ name: { $regex: escaped, $options: 'i' } },
				{ description: { $regex: escaped, $options: 'i' } },
			];
		}

		if (filters.categoryId || categoryIds?.length) {
			query.categoryId = { $in: categoryIds ?? [this.toUuid(filters.categoryId!, 'categoryId')] };
		}
		const brands = this.parseMultiValue(filters.brand);
		const colors = this.parseMultiValue(filters.color);
		if (brands.length) query.brand = { $in: brands };
		if (colors.length) query.color = { $in: colors };
		for (const [key, values] of Object.entries(this.parseAttributeFilters(filters.attributeFilters))) {
			query[`attributes.${key}`] = { $in: values };
		}

		const minPrice = filters.minPrice === undefined || filters.minPrice === '' ? undefined : Number(filters.minPrice);
		const maxPrice = filters.maxPrice === undefined || filters.maxPrice === '' ? undefined : Number(filters.maxPrice);
		if (
			(minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) ||
			(maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0))
		) {
			throw new BadRequestException('Price filters must be valid non-negative numbers');
		}
		if (minPrice !== undefined || maxPrice !== undefined) {
			query.price = {};
			if (minPrice !== undefined) query.price.$gte = minPrice;
			if (maxPrice !== undefined) query.price.$lte = maxPrice;
		}

		if (scope.mode !== 'public') {
			if (filters.isActive === 'true') query.isActive = true;
			if (filters.isActive === 'false') query.isActive = false;
			if (filters.inStock === 'true') query.stock = { $gt: 0 };
			if (filters.inStock === 'false') query.stock = { $lte: 0 };
		}

		const sort =
			filters.sort === 'price-asc'
				? { price: 1 as const }
				: filters.sort === 'price-desc'
					? { price: -1 as const }
					: { createdAt: -1 as const };

		return { query, sort };
	}

	private async paginate(filters: ProductListFilters, scope: ListScope) {
		let categoryIds: string[] | undefined;
		const selectedCategoryIds = [
			...(filters.categoryId ? [filters.categoryId] : []),
			...(filters.categoryIds?.split(',').map((id) => id.trim()).filter(Boolean) ?? []),
		];
		if (selectedCategoryIds.length) {
			const selectedIds = selectedCategoryIds.map((id) => this.toUuid(id, 'categoryId'));
			const categories = await this.categoryModel.find().select('_id parentId').lean().exec();
			const descendants = new Set<string>(selectedIds.map((id) => id.toString()));
			let changed = true;
			while (changed) {
				changed = false;
				for (const category of categories) {
					const id = category._id.toString();
					const parentId = category.parentId?.toString();
					if (parentId && descendants.has(parentId) && !descendants.has(id)) {
						descendants.add(id);
						changed = true;
					}
				}
			}
			categoryIds = [...descendants];
		}
		const { query, sort } = this.buildQuery(filters, scope, categoryIds);
		const { page, limit, skip } = this.parsePage(filters);
		const facetFilters: ProductListFilters = {
			...filters,
			minPrice: undefined,
			maxPrice: undefined,
			brand: undefined,
			color: undefined,
			attributeFilters: undefined,
		};
		const facetQuery = this.buildQuery(facetFilters, scope, categoryIds).query;
		const [items, total, facetProducts] = await Promise.all([
			this.productModel.find(query).sort(sort).skip(skip).limit(limit).exec(),
			this.productModel.countDocuments(query).exec(),
			this.productModel.find(facetQuery).select('price brand color attributes').lean().exec(),
		]);
		const brands = new Set<string>();
		const colors = new Set<string>();
		const attributes = new Map<string, Set<string>>();
		let minProductPrice = Number.POSITIVE_INFINITY;
		let maxProductPrice = Number.NEGATIVE_INFINITY;
		for (const product of facetProducts as Array<{ price?: number; brand?: string; color?: string; attributes?: Record<string, string> | Map<string, string> }>) {
			if (typeof product.price === 'number' && Number.isFinite(product.price)) {
				minProductPrice = Math.min(minProductPrice, product.price);
				maxProductPrice = Math.max(maxProductPrice, product.price);
			}
			if (product.brand?.trim()) brands.add(product.brand.trim());
			if (product.color?.trim()) colors.add(product.color.trim());
			const productAttributes = product.attributes instanceof Map
				? Object.fromEntries(product.attributes.entries())
				: product.attributes ?? {};
			for (const [key, rawValue] of Object.entries(productAttributes)) {
				if (typeof rawValue !== 'string' || !rawValue.trim()) continue;
				const values = attributes.get(key) ?? new Set<string>();
				values.add(rawValue.trim());
				attributes.set(key, values);
			}
		}
		return {
			items,
			total,
			page,
			limit,
			totalPages: Math.max(1, Math.ceil(total / limit) || 1),
			facets: {
				minPrice: Number.isFinite(minProductPrice) ? Math.floor(minProductPrice) : 0,
				maxPrice: Number.isFinite(maxProductPrice) ? Math.ceil(maxProductPrice) : 0,
				brands: [...brands].sort((a, b) => a.localeCompare(b)),
				colors: [...colors].sort((a, b) => a.localeCompare(b)),
				attributes: Object.fromEntries([...attributes.entries()].map(([key, values]) => [key, [...values].sort((a, b) => a.localeCompare(b))])),
			},
		};
	}

	async listCatalog(filters: ProductListFilters) {
		return this.paginate(filters, { mode: 'public' });
	}

	async listMine(sellerId: string, filters: ProductListFilters) {
		return this.paginate(filters, { mode: 'seller', sellerId });
	}

	async listAdmin(filters: ProductListFilters) {
		return this.paginate(filters, { mode: 'admin' });
	}

	private async emitProductStats() {
		const [totalProducts, outOfStockProducts] = await Promise.all([
			this.productModel.countDocuments().exec(),
			this.productModel.countDocuments({ stock: { $lte: 0 } }).exec(),
		]);
		this.notificationsService.emitLiveEvent(
			{ broadcast: true },
			'product:changed',
			{ totalProducts, outOfStockProducts },
		);
	}

	private async assertCategory(categoryId: string) {
		const uuid = this.toUuid(categoryId, 'categoryId');
		const exists = await this.categoryModel.exists({ _id: uuid }).exec();
		if (!exists) throw new BadRequestException('Category not found');
		const hasChildren = await this.categoryModel.exists({ parentId: uuid }).exec();
		if (hasChildren) throw new BadRequestException('Products must be assigned to a leaf category');
		return uuid;
	}

	async create(sellerId: string, dto: CreateProductDto) {
		const sellerUuid = this.toUuid(sellerId, 'sellerId');
		const categoryUuid = await this.assertCategory(dto.categoryId);
		const doc = await this.productModel.create({
			sellerId: sellerUuid,
			categoryId: categoryUuid,
			name: dto.name,
			description: dto.description,
			price: dto.price,
			brand: dto.brand?.trim() || undefined,
			color: dto.color?.trim() || undefined,
			attributes: this.normalizeAttributes(dto.attributes),
			stock: dto.stock,
			images: dto.images ?? [],
			isActive: dto.isActive ?? true,
		});

		void this.emitProductStats();
		return doc;
	}

	private async getOwnedOrAdmin(
		productId: string,
		actor: { id: string; role: UserRole },
	) {
		const productUuid = this.toUuid(productId, 'productId');
		const existing = await this.productModel.findById(productUuid).exec();
		if (!existing) throw new NotFoundException('Product not found');
		if (actor.role !== UserRole.ADMIN && String(existing.sellerId) !== String(actor.id)) {
			throw new ForbiddenException('You do not own this product');
		}
		return existing;
	}

	async update(productId: string, dto: UpdateProductDto, actor: { id: string; role: UserRole }) {
		const existing = await this.getOwnedOrAdmin(productId, actor);

		if (dto.name !== undefined) existing.name = dto.name;
		if (dto.description !== undefined) existing.description = dto.description;
		if (dto.price !== undefined) existing.price = dto.price;
		if (dto.brand !== undefined) existing.brand = dto.brand.trim() || undefined;
		if (dto.color !== undefined) existing.color = dto.color.trim() || undefined;
		if (dto.attributes !== undefined) existing.attributes = this.normalizeAttributes(dto.attributes);
		if (dto.stock !== undefined) existing.stock = dto.stock;
		if (dto.images !== undefined) existing.images = dto.images;
		if (dto.isActive !== undefined) existing.isActive = dto.isActive;
		if (dto.categoryId !== undefined) existing.categoryId = await this.assertCategory(dto.categoryId);

		await existing.save();
		void this.emitProductStats();
		return existing;
	}

	async remove(productId: string, actor: { id: string; role: UserRole }) {
		const existing = await this.getOwnedOrAdmin(productId, actor);
		await this.productModel.deleteOne({ _id: existing._id }).exec();
		void this.emitProductStats();
		return { ok: true };
	}

	async setActive(productId: string, isActive: boolean, actor: { id: string; role: UserRole }) {
		const existing = await this.getOwnedOrAdmin(productId, actor);
		existing.isActive = isActive;
		await existing.save();
		void this.emitProductStats();
		return existing;
	}
}
