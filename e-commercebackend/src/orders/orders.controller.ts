import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { parseBusinessDateBoundary } from '../common/utils/business-date.util';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateExchangeRequestDto } from './dto/create-exchange-request.dto';
import { UpdateExchangeStatusDto } from './dto/update-exchange-status.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
	constructor(private readonly ordersService: OrdersService) {}

	@Post()
	@Roles(UserRole.CUSTOMER)
	create(@Req() req: Request & { user?: any }, @Body() dto: CreateOrderDto) {
		if (dto.paymentMethod === 'BANK_CARD') throw new BadRequestException('Use the local card simulation endpoint for bank card orders');
		return this.ordersService.create(req.user.sub, dto);
	}

	@Get('me')
	@Roles(UserRole.CUSTOMER)
	listMine(
		@Req() req: Request & { user?: any },
		@Query('from') fromValue?: string,
		@Query('to') toValue?: string,
	) {
		let from: Date | undefined;
		let to: Date | undefined;
		if (fromValue && toValue) {
			from = parseBusinessDateBoundary(fromValue, 'start');
			to = parseBusinessDateBoundary(toValue, 'end');
		}
		return this.ordersService.listMine(req.user.sub, from, to);
	}

	@Get('seller')
	@Roles(UserRole.SELLER)
	listSellerOrders(@Req() req: Request & { user?: any }) {
		return this.ordersService.listSellerOrders(req.user.sub);
	}

	@Patch(':id/cancel')
	@Roles(UserRole.CUSTOMER)
	cancelByCustomer(@Req() req: Request & { user?: any }, @Param('id') id: string) {
		return this.ordersService.cancelByCustomer(id, req.user.sub);
	}

	@Post(':id/exchange-request')
	@Roles(UserRole.CUSTOMER)
	requestExchange(
		@Req() req: Request & { user?: any },
		@Param('id') id: string,
		@Body() dto: CreateExchangeRequestDto,
	) {
		return this.ordersService.requestExchange(id, req.user.sub, dto);
	}

	@Patch(':id/exchange-status')
	@Roles(UserRole.ADMIN, UserRole.SELLER)
	updateExchangeStatus(
		@Req() req: Request & { user?: any },
		@Param('id') id: string,
		@Body() dto: UpdateExchangeStatusDto,
	) {
		return this.ordersService.updateExchangeStatus(id, dto.status, req.user);
	}

	@Patch(':id/status')
	@Roles(UserRole.ADMIN, UserRole.SELLER)
	updateStatus(
		@Req() req: Request & { user?: any },
		@Param('id') id: string,
		@Body('status') status: string,
	) {
		if (!status) throw new BadRequestException('Status is required');
		return this.ordersService.updateStatus(id, status, req.user);
	}

	@Get('seller/stats')
	@Roles(UserRole.SELLER)
	async sellerStats(
		@Req() req: Request & { user?: any },
		@Query('from') fromValue: string,
		@Query('to') toValue: string,
	) {
		const from = parseBusinessDateBoundary(fromValue, 'start');
		const to = parseBusinessDateBoundary(toValue, 'end');
		if (!fromValue || !toValue || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
			throw new BadRequestException('A valid date range is required');
		}
		return this.ordersService.getSellerStats(req.user.sub, from, to);
	}

	@Get('admin/stats')
	@Roles(UserRole.ADMIN)
	async adminStats(
		@Query('from') fromValue: string,
		@Query('to') toValue: string,
	) {
		const from = parseBusinessDateBoundary(fromValue, 'start');
		const to = parseBusinessDateBoundary(toValue, 'end');
		if (!fromValue || !toValue || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
			throw new BadRequestException('A valid date range is required');
		}
		return this.ordersService.getAdminStats(from, to);
	}

	@Get('admin/recent')
	@Roles(UserRole.ADMIN)
	async adminRecentOrders(@Query('limit') limitStr?: string) {
		const limit = limitStr ? Math.min(Math.max(1, parseInt(limitStr, 10)), 100) : 10;
		return this.ordersService.getAdminRecentOrders(limit);
	}
}
