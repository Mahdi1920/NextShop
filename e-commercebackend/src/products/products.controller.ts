import {
	Body,
	Controller,
	Delete,
	Get,
	Query,
	Param,
	Patch,
	Post,
	Put,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService, type ProductListFilters } from './products.service';

type AuthRequest = Request & { user?: { sub: string; role: UserRole } };

@Controller('products')
export class ProductsController {
	constructor(private readonly productsService: ProductsService) {}

	private catalogQuery(
		search?: string,
		categoryId?: string,
		minPrice?: string,
		maxPrice?: string,
		sort?: string,
		page?: string,
		limit?: string,
		isActive?: string,
		inStock?: string,
		sellerId?: string,
		categoryIds?: string,
		brand?: string,
		color?: string,
		attributeFilters?: string,
	): ProductListFilters {
		return { search, categoryId, categoryIds, brand, color, attributeFilters, minPrice, maxPrice, sort, page, limit, isActive, inStock, sellerId };
	}

	@Get()
	async listCatalog(
		@Query('search') search?: string,
		@Query('categoryId') categoryId?: string,
		@Query('minPrice') minPrice?: string,
		@Query('maxPrice') maxPrice?: string,
		@Query('sort') sort?: string,
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@Query('sellerId') sellerId?: string,
		@Query('categoryIds') categoryIds?: string,
		@Query('brand') brand?: string,
		@Query('color') color?: string,
		@Query('attributeFilters') attributeFilters?: string,
	) {
		return this.productsService.listCatalog(
			this.catalogQuery(search, categoryId, minPrice, maxPrice, sort, page, limit, undefined, undefined, sellerId, categoryIds, brand, color, attributeFilters),
		);
	}

	@Get('admin')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.ADMIN)
	async listAdmin(
		@Query('search') search?: string,
		@Query('categoryId') categoryId?: string,
		@Query('minPrice') minPrice?: string,
		@Query('maxPrice') maxPrice?: string,
		@Query('sort') sort?: string,
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@Query('isActive') isActive?: string,
		@Query('inStock') inStock?: string,
		@Query('categoryIds') categoryIds?: string,
		@Query('brand') brand?: string,
		@Query('color') color?: string,
		@Query('attributeFilters') attributeFilters?: string,
	) {
		return this.productsService.listAdmin(
			this.catalogQuery(search, categoryId, minPrice, maxPrice, sort, page, limit, isActive, inStock, undefined, categoryIds, brand, color, attributeFilters),
		);
	}

	@Get('me')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.SELLER)
	async listMine(
		@Req() req: AuthRequest,
		@Query('search') search?: string,
		@Query('categoryId') categoryId?: string,
		@Query('minPrice') minPrice?: string,
		@Query('maxPrice') maxPrice?: string,
		@Query('sort') sort?: string,
		@Query('page') page?: string,
		@Query('limit') limit?: string,
		@Query('isActive') isActive?: string,
		@Query('inStock') inStock?: string,
		@Query('categoryIds') categoryIds?: string,
		@Query('brand') brand?: string,
		@Query('color') color?: string,
		@Query('attributeFilters') attributeFilters?: string,
	) {
		return this.productsService.listMine(
			req.user!.sub,
			this.catalogQuery(search, categoryId, minPrice, maxPrice, sort, page, limit, isActive, inStock, undefined, categoryIds, brand, color, attributeFilters),
		);
	}

	@Post()
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.SELLER)
	async create(@Req() req: AuthRequest, @Body() dto: CreateProductDto) {
		return this.productsService.create(req.user!.sub, dto);
	}

	@Put(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.SELLER, UserRole.ADMIN)
	async update(@Req() req: AuthRequest, @Param('id') id: string, @Body() dto: UpdateProductDto) {
		return this.productsService.update(id, dto, { id: req.user!.sub, role: req.user!.role });
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.SELLER, UserRole.ADMIN)
	async remove(@Req() req: AuthRequest, @Param('id') id: string) {
		return this.productsService.remove(id, { id: req.user!.sub, role: req.user!.role });
	}

	@Patch(':id/activate')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.SELLER, UserRole.ADMIN)
	async activate(@Req() req: AuthRequest, @Param('id') id: string) {
		return this.productsService.setActive(id, true, { id: req.user!.sub, role: req.user!.role });
	}

	@Patch(':id/deactivate')
	@UseGuards(JwtAuthGuard, RolesGuard)
	@Roles(UserRole.SELLER, UserRole.ADMIN)
	async deactivate(@Req() req: AuthRequest, @Param('id') id: string) {
		return this.productsService.setActive(id, false, { id: req.user!.sub, role: req.user!.role });
	}
}
