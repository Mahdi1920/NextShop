import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { isUUID } from 'class-validator';
import { Product, ProductDocument } from '../products/schemas/product.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreateExchangeRequestDto } from './dto/create-exchange-request.dto';
import { ExchangeRequestStatus } from './dto/update-exchange-status.dto';
import { Order, OrderDocument } from './schemas/order.schema';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole } from '../common/enums/role.enum';
import { businessDateKey } from '../common/utils/business-date.util';

const DELIVERY_COST = 7;

@Injectable()
export class OrdersService {
	constructor(
		@InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
		@InjectModel(Product.name) private readonly productModel: Model<ProductDocument>,
		private readonly notificationsService: NotificationsService,
	) {}

	async create(customerId: string, dto: CreateOrderDto, paymentPending = false) {
		const customerUuid = customerId;
		const decremented: Array<{ productId: string; quantity: number }> = [];
		const productSellerMap: Map<string, { sellerId?: string; name: string; remainingStock: number }> = new Map();

		try {
			const items: Array<{ productId: string; sellerId: string; categoryId: string; name: string; price: number; quantity: number; images: string[] }> = [];
			for (const item of dto.items) {
				const productId = item.productId;
				const product = await this.productModel.findById(productId).exec();
				if (!product || !product.isActive) throw new NotFoundException('Product is unavailable');
				const result = await this.productModel.updateOne(
					{ _id: productId, isActive: true, stock: { $gte: item.quantity } },
					{ $inc: { stock: -item.quantity } },
				).exec();
				if (result.modifiedCount !== 1) throw new BadRequestException(`Insufficient stock for ${product.name}`);
				decremented.push({ productId, quantity: item.quantity });
				items.push({ productId, sellerId: product.sellerId, categoryId: product.categoryId, name: product.name, price: product.price, quantity: item.quantity, images: product.images ?? [] });

				const remainingStock = (product.stock || 0) - item.quantity;
				productSellerMap.set(productId.toString(), {
					sellerId: product.sellerId || undefined,
					name: product.name,
					remainingStock,
				});
			}

			const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
			const total = subtotal + DELIVERY_COST;
			const createdOrder = await this.orderModel.create({
				customerId: customerUuid,
				items,
				deliveryCost: DELIVERY_COST,
				total,
				deliveryAddress: dto.deliveryAddress.trim(),
				phone: dto.phone.trim(),
				paymentMethod: dto.paymentMethod,
				status: paymentPending ? 'PAYMENT_PENDING' : 'PENDING',
				...(paymentPending ? { paymentStatus: 'PENDING', paymentProvider: 'SIMULATOR' } : {}),
			});
			if (paymentPending) return createdOrder;
			await this.notifyOrderCreated(createdOrder, items, productSellerMap, customerUuid);
			return createdOrder;
		} catch (error) {
			await Promise.all(decremented.map(({ productId, quantity }) =>
				this.productModel.updateOne({ _id: productId }, { $inc: { stock: quantity } }).exec(),
			));
			throw error;
		}
	}

	private async notifyOrderCreated(createdOrder: OrderDocument, items: Array<{ productId: string; sellerId: string; categoryId: string; name: string; price: number; quantity: number; images: string[] }>, productSellerMap: Map<string, { sellerId?: string; name: string; remainingStock: number }>, customerUuid: string) {

			// Check for out-of-stock products
			for (const [, info] of productSellerMap.entries()) {
				if (info.remainingStock <= 0) {
					// Notify admin
					void this.notificationsService.createAndSend({
						role: UserRole.ADMIN,
						type: 'PRODUCT_OUT_OF_STOCK',
						title: 'Product Out of Storage',
						message: `Product "${info.name}" is now out of storage/stock!`,
						data: { name: info.name },
					}).catch(() => undefined);

					// Notify seller if assigned
					if (info.sellerId) {
						void this.notificationsService.createAndSend({
							recipientId: info.sellerId,
							type: 'PRODUCT_OUT_OF_STOCK',
							title: 'Product Out of Storage',
							message: `Your product "${info.name}" is now out of storage/stock!`,
							data: { name: info.name },
						}).catch(() => undefined);
					}

					this.notificationsService.emitLiveEvent({ broadcast: true }, 'product:out_of_stock', {
						name: info.name,
						sellerId: info.sellerId,
					});
				}
			}

			// Group items by seller to notify them of customer command
			const sellerOrderTotals: Map<string, number> = new Map();
			for (const item of items) {
				const info = productSellerMap.get(item.productId.toString());
				if (info?.sellerId) {
					const curr = sellerOrderTotals.get(info.sellerId) || 0;
					sellerOrderTotals.set(info.sellerId, curr + item.price * item.quantity);
				}
			}

			for (const [sellerId, sellerTotal] of sellerOrderTotals.entries()) {
				void this.notificationsService.createAndSend({
					recipientId: sellerId,
					type: 'ORDER_CREATED',
					title: 'New Customer Command',
					message: `A customer placed a new command #${createdOrder._id} for your store (${sellerTotal.toFixed(2)} TND).`,
					data: { orderId: createdOrder._id, total: sellerTotal },
				}).catch(() => undefined);

				this.notificationsService.emitLiveEvent({ userId: sellerId }, 'dashboard:refresh:seller', {
					orderId: createdOrder._id,
				});
				this.notificationsService.emitLiveEvent({ userId: sellerId }, 'order:created', {
					orderId: createdOrder._id,
				});
			}

			// Notify admin
			void this.notificationsService.createAndSend({
				role: UserRole.ADMIN,
				type: 'ORDER_CREATED',
				title: 'New Order Placed',
				message: `New order #${createdOrder._id} placed (Total: ${createdOrder.total.toFixed(2)} TND).`,
				data: { orderId: createdOrder._id, total: createdOrder.total },
			}).catch(() => undefined);

			this.notificationsService.emitLiveEvent({ role: UserRole.ADMIN, broadcast: true }, 'dashboard:refresh:admin', {
				orderId: createdOrder._id,
			});
			this.notificationsService.emitLiveEvent({ role: UserRole.ADMIN, broadcast: true }, 'order:created', {
				orderId: createdOrder._id,
			});
			this.notificationsService.emitLiveEvent({ role: UserRole.SELLER, broadcast: true }, 'dashboard:refresh:seller', {
				orderId: createdOrder._id,
			});
			this.notificationsService.emitLiveEvent({ userId: customerUuid, broadcast: true }, 'dashboard:refresh:customer', {
				orderId: createdOrder._id,
			});

	}

	async markSimulatedPayment(orderId: string, state: 'PAID' | 'FAILED', reference?: string) {
		const order = await this.orderModel.findOne({ _id: orderId, paymentProvider: 'SIMULATOR' }).exec();
		if (!order) throw new NotFoundException('Payment order not found');
		if (order.paymentStatus === 'PAID' || order.paymentStatus === 'FAILED') return order;
		const updated = await this.orderModel.findOneAndUpdate(
			{ _id: orderId, paymentProvider: 'SIMULATOR', paymentStatus: 'PENDING', status: 'PAYMENT_PENDING' },
			{ $set: state === 'PAID'
				? { paymentStatus: 'PAID', status: 'PENDING', paymentTransactionId: reference }
				: { paymentStatus: 'FAILED', status: 'CANCELLED', paymentFailureRestocked: true } },
			{ new: true },
		).exec();
		if (!updated) return this.orderModel.findById(orderId).exec();
		if (state === 'FAILED') {
			await Promise.all(order.items.map((item) => this.productModel.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }).exec()));
			return updated;
		}
		const currentProducts = await this.productModel.find({ _id: { $in: order.items.map((item) => item.productId) } }).select('_id stock').exec();
		const currentStock = new Map(currentProducts.map((product) => [product._id.toString(), product.stock]));
		const productSellerMap = new Map<string, { sellerId?: string; name: string; remainingStock: number }>();
		for (const item of order.items) productSellerMap.set(item.productId, { sellerId: item.sellerId, name: item.name, remainingStock: currentStock.get(item.productId) ?? 1 });
		await this.notifyOrderCreated(updated, order.items as any, productSellerMap, order.customerId);
		return updated;
	}

	async updateStatus(orderId: string, status: string, actor?: { sub?: string; role?: string }) {
		const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCHANGING', 'RETURNING', 'CANCELLED'];
		const normalizedStatus = status.toUpperCase();
		if (!validStatuses.includes(normalizedStatus)) {
			throw new BadRequestException(`Invalid order status: ${status}. Must be one of ${validStatuses.join(', ')}`);
		}
		if (normalizedStatus === 'CANCELLED') {
			throw new BadRequestException('Orders can only be cancelled through the customer cancellation action');
		}

		if (!isUUID(orderId, '4')) {
			throw new BadRequestException('Invalid order ID');
		}

		const order = await this.orderModel.findById(orderId).exec();
		if (!order) throw new NotFoundException('Order not found');
		if (order.exchangeRequest) throw new BadRequestException('Use the exchange progress controls to update this order');
		if (actor?.role?.toUpperCase() === UserRole.SELLER) {
			if (!actor.sub || !isUUID(actor.sub, '4')) throw new NotFoundException('Order not found');
			const sellerProducts = await this.productModel.find({ sellerId: actor.sub }).select('_id').exec();
			const sellerProductIds = sellerProducts.map((product) => product._id.toString());
			if (!order.items.some((item) => sellerProductIds.includes(item.productId.toString()))) {
				throw new NotFoundException('Order not found');
			}
		}
		const currentStatus = this.normalizeOrderStatus(order.status);
		const nextStatuses: Record<string, string[]> = {
			PENDING: ['CONFIRMED'],
			CONFIRMED: ['PREPARING'],
			PREPARING: ['OUT_FOR_DELIVERY'],
			OUT_FOR_DELIVERY: ['DELIVERED', 'RETURNING'],
			DELIVERED: ['RETURNING'],
			EXCHANGING: [],
			RETURNING: [],
			CANCELLED: [],
		};
		if (currentStatus !== normalizedStatus && !nextStatuses[currentStatus]?.includes(normalizedStatus)) {
			throw new BadRequestException(`Order status cannot move from ${currentStatus} to ${normalizedStatus}`);
		}
		if (actor?.role?.toUpperCase() === UserRole.SELLER && currentStatus === 'CANCELLED') {
			throw new BadRequestException('A cancelled order cannot be changed by a seller');
		}
		if (currentStatus === normalizedStatus) return order;

		const updatedOrder = await this.orderModel.findOneAndUpdate(
			{ _id: order._id, status: order.status },
			{ $set: { status: normalizedStatus, ...(normalizedStatus === 'DELIVERED' ? { deliveredAt: new Date() } : {}) } },
			{ new: true },
		).exec();
		if (!updatedOrder) throw new BadRequestException('Order status was changed by another request. Refresh and try again.');

		// Notify Customer of status update
		const customerId = order.customerId ? order.customerId.toString() : null;
		if (customerId) {
			const isOutOfDelivery = normalizedStatus === 'OUT_FOR_DELIVERY';
			const isExchanging = normalizedStatus === 'EXCHANGING';
			void this.notificationsService.createAndSend({
				recipientId: customerId,
				type: isOutOfDelivery ? 'ORDER_OUT_FOR_DELIVERY' : 'ORDER_STATUS_UPDATED',
				title: isOutOfDelivery ? 'Command Out for Delivery! 🚚' : 'Command Status Updated',
				message: isOutOfDelivery
					? `Your command #${order._id} is out for delivery to ${order.deliveryAddress}!`
					: isExchanging
						? `A product exchange for order #${order._id} is now in progress.`
						: `Your command #${order._id} is now ${normalizedStatus.replace(/_/g, ' ')}.`,
				data: { orderId: order._id, status: normalizedStatus },
			}).catch(() => undefined);

			this.notificationsService.emitLiveEvent({ userId: customerId }, 'order:status_updated', {
				orderId: order._id,
				status: normalizedStatus,
			});
			this.notificationsService.emitLiveEvent({ userId: customerId }, 'dashboard:refresh:customer', {
				orderId: order._id,
				status: normalizedStatus,
			});
		}

		// Notify role rooms to update dashboards live
		this.notificationsService.emitLiveEvent({ role: UserRole.ADMIN, broadcast: true }, 'dashboard:refresh:admin', {
			orderId: order._id,
			status: normalizedStatus,
		});
		this.notificationsService.emitLiveEvent({ role: UserRole.SELLER, broadcast: true }, 'dashboard:refresh:seller', {
			orderId: order._id,
			status: normalizedStatus,
		});
		this.notificationsService.emitLiveEvent({ broadcast: true }, 'dashboard:refresh:customer', {
			orderId: order._id,
			status: normalizedStatus,
		});

		return updatedOrder;
	}

	async requestExchange(orderId: string, customerId: string, dto: CreateExchangeRequestDto) {
		if (!isUUID(orderId, '4') || !isUUID(customerId, '4')) {
			throw new NotFoundException('Order not found');
		}
		const order = await this.orderModel.findOne({ _id: orderId, customerId }).exec();
		if (!order) throw new NotFoundException('Order not found');
		if (this.normalizeOrderStatus(order.status) !== 'DELIVERED') {
			throw new BadRequestException('An exchange can only be requested for a delivered order');
		}
		if (order.exchangeRequest) throw new BadRequestException('An exchange request already exists for this order');
		const deliveredAt = order.deliveredAt ?? order.updatedAt ?? order.createdAt;
		if (Date.now() > deliveredAt.getTime() + 3 * 24 * 60 * 60 * 1000) {
			throw new BadRequestException('The 3-day exchange request period has expired');
		}
		const requestedOriginals = new Set<string>();
		const requestItems = [];
		let exchangeSellerId: string | undefined;
		for (const input of dto.items) {
			if (requestedOriginals.has(input.originalProductId)) throw new BadRequestException('Each order product can only be selected once');
			requestedOriginals.add(input.originalProductId);
			const original = order.items.find((item) => item.productId.toString() === input.originalProductId);
			if (!original || input.quantity > original.quantity) throw new BadRequestException('Exchange quantity exceeds the purchased quantity');
			const originalProduct = await this.productModel.findById(original.productId).select('sellerId').exec();
			const replacement = await this.productModel.findOne({ _id: input.replacementProductId, isActive: true, stock: { $gte: input.quantity } }).exec();
			if (!replacement) throw new BadRequestException('A selected replacement product is unavailable or out of stock');
			if (replacement._id.toString() === input.originalProductId) throw new BadRequestException('Choose a different replacement product');
			if (!originalProduct || !originalProduct.sellerId || replacement.sellerId !== originalProduct.sellerId) {
				throw new BadRequestException('Choose a replacement sold by the same seller as the original product');
			}
			const originalSellerId = originalProduct.sellerId;
			if (exchangeSellerId && exchangeSellerId !== originalSellerId) {
				throw new BadRequestException('A single exchange request can include products from only one seller');
			}
			exchangeSellerId = originalSellerId;
			requestItems.push({
				originalProductId: original.productId,
				originalName: original.name,
				replacementProductId: replacement._id,
				replacementName: replacement.name,
				replacementCategoryId: replacement.categoryId,
				replacementPrice: replacement.price,
				quantity: input.quantity,
			});
		}
		const exchangeRequest = { reason: dto.reason.trim(), items: requestItems, requestedAt: new Date(), status: 'REQUESTED', history: [{ status: 'REQUESTED', changedAt: new Date() }] };
		if (!exchangeRequest.reason) throw new BadRequestException('Please provide a reason for the exchange');
		const updatedOrder = await this.orderModel.findOneAndUpdate(
			{ _id: order._id, customerId: order.customerId, status: order.status, exchangeRequest: { $exists: false } },
			{ $set: { exchangeRequest } },
			{ new: true },
		).exec();
		if (!updatedOrder) throw new BadRequestException('The order changed while submitting the exchange request. Refresh and try again.');

		const customer = order.customerId.toString();
		const event = { orderId: order._id, status: order.status, exchangeStatus: 'REQUESTED' };
		void this.notificationsService.createAndSend({
			recipientId: customer,
			type: 'ORDER_EXCHANGE_REQUESTED',
			title: 'Exchange request submitted',
			message: `Your exchange request for order #${order._id} was submitted.`,
			data: event,
		}).catch(() => undefined);
		try {
			const originalProducts = await this.productModel.find({ _id: { $in: requestItems.map((item) => item.originalProductId) } }).select('sellerId').exec();
			for (const sellerId of new Set(originalProducts.map((product) => product.sellerId.toString()))) {
				void this.notificationsService.createAndSend({
					recipientId: sellerId,
					type: 'ORDER_EXCHANGE_REQUESTED',
					title: 'Customer requested a product exchange',
					message: `A customer submitted an exchange request for order #${order._id}.`,
					data: event,
				}).catch(() => undefined);
			}
		} catch { /* The saved request remains visible in seller orders. */ }
		this.notificationsService.emitLiveEvent({ userId: customer }, 'order:status_updated', event);
		this.notificationsService.emitLiveEvent({ userId: customer, broadcast: true }, 'dashboard:refresh:customer', event);
		this.notificationsService.emitLiveEvent({ role: UserRole.SELLER, broadcast: true }, 'dashboard:refresh:seller', event);
		this.notificationsService.emitLiveEvent({ role: UserRole.ADMIN, broadcast: true }, 'dashboard:refresh:admin', event);
		return updatedOrder;
	}

	async updateExchangeStatus(orderId: string, status: ExchangeRequestStatus, actor?: { sub?: string; role?: string }) {
		if (!isUUID(orderId, '4')) throw new BadRequestException('Invalid order ID');
		const order = await this.orderModel.findById(orderId).exec();
		if (!order || !order.exchangeRequest) throw new NotFoundException('Exchange request not found');
		const exchange = order.exchangeRequest;
		const currentStatus = exchange.status || 'REQUESTED';
		const nextStatuses: Record<string, string[]> = {
			REQUESTED: ['PREPARING', 'REJECTED'],
			PREPARING: ['OUT_FOR_DELIVERY'],
			OUT_FOR_DELIVERY: ['EXCHANGED', 'RETURNING'],
			RETURNING: ['RETURNED'],
			REJECTED: [], EXCHANGED: [], RETURNED: [],
		};
		if (!nextStatuses[currentStatus]?.includes(status)) {
			throw new BadRequestException(`Exchange status cannot move from ${currentStatus} to ${status}`);
		}
		if (actor?.role?.toUpperCase() === UserRole.SELLER) {
			if (!actor.sub || !isUUID(actor.sub, '4')) throw new NotFoundException('Exchange request not found');
			const sellerId = actor.sub;
			const involvedIds = [...new Set(exchange.items.map((item) => item.originalProductId))];
			const ownedCount = await this.productModel.countDocuments({ _id: { $in: involvedIds }, sellerId }).exec();
			if (ownedCount !== involvedIds.length) throw new NotFoundException('Exchange request not found');
		}

		const stockChanges = new Map<string, { productId: string; quantity: number }>();
		if (status === 'PREPARING' || status === 'RETURNED') {
			for (const item of exchange.items) {
				const key = item.replacementProductId;
				const existing = stockChanges.get(key);
				stockChanges.set(key, { productId: item.replacementProductId, quantity: (existing?.quantity ?? 0) + item.quantity });
			}
		}
		const appliedStockChanges: Array<{ productId: string; quantity: number }> = [];
		if (status === 'PREPARING') {
			for (const change of stockChanges.values()) {
				const result = await this.productModel.updateOne(
					{ _id: change.productId, isActive: true, stock: { $gte: change.quantity } },
					{ $inc: { stock: -change.quantity } },
				).exec();
				if (result.modifiedCount !== 1) {
					await Promise.all(appliedStockChanges.map((entry) => this.productModel.updateOne({ _id: entry.productId }, { $inc: { stock: entry.quantity } }).exec()));
					throw new BadRequestException('Replacement stock is no longer available');
				}
				appliedStockChanges.push(change);
			}
		}

		const exchangeStatusFilter = currentStatus === 'REQUESTED'
			? { $or: [{ 'exchangeRequest.status': 'REQUESTED' }, { 'exchangeRequest.status': { $exists: false } }] }
			: { 'exchangeRequest.status': currentStatus };
		const updatedOrder = await this.orderModel.findOneAndUpdate(
			{ _id: order._id, ...exchangeStatusFilter },
			{ $set: { 'exchangeRequest.status': status }, $push: { 'exchangeRequest.history': { status, changedAt: new Date(), changedBy: actor?.sub && isUUID(actor.sub, '4') ? actor.sub : undefined } } },
			{ new: true },
		).exec();
		if (!updatedOrder) {
			await Promise.all(appliedStockChanges.map((entry) => this.productModel.updateOne({ _id: entry.productId }, { $inc: { stock: entry.quantity } }).exec()));
			throw new BadRequestException('The exchange request changed. Refresh and try again.');
		}
		if (status === 'RETURNED') {
			await Promise.all([...stockChanges.values()].map((entry) => this.productModel.updateOne({ _id: entry.productId }, { $inc: { stock: entry.quantity } }).exec()));
		}

		const customerId = order.customerId.toString();
		const event = { orderId: order._id, status: order.status, exchangeStatus: status };
		void this.notificationsService.createAndSend({
			recipientId: customerId,
			type: 'ORDER_EXCHANGE_STATUS_UPDATED',
			title: 'Exchange request updated',
			message: `Your exchange request for order #${order._id} is now ${status.replace(/_/g, ' ').toLowerCase()}.`,
			data: event,
		}).catch(() => undefined);
		this.notificationsService.emitLiveEvent({ userId: customerId }, 'order:status_updated', event);
		this.notificationsService.emitLiveEvent({ userId: customerId }, 'dashboard:refresh:customer', event);
		this.notificationsService.emitLiveEvent({ role: UserRole.SELLER, broadcast: true }, 'dashboard:refresh:seller', event);
		this.notificationsService.emitLiveEvent({ role: UserRole.ADMIN, broadcast: true }, 'dashboard:refresh:admin', event);
		return updatedOrder;
	}

	async cancelByCustomer(orderId: string, customerId: string) {
		if (!isUUID(orderId, '4') || !isUUID(customerId, '4')) {
			throw new NotFoundException('Order not found');
		}
		const order = await this.orderModel.findOne({ _id: orderId, customerId }).exec();
		if (!order) throw new NotFoundException('Order not found');
		if (!['PENDING', 'CONFIRMED', 'PREPARING'].includes(this.normalizeOrderStatus(order.status))) {
			throw new BadRequestException('Orders can only be cancelled before they are out for delivery');
		}

		const cancelledOrder = await this.orderModel.findOneAndUpdate(
			{ _id: order._id, customerId, status: order.status },
			{ $set: { status: 'CANCELLED' } },
			{ new: true },
		).exec();
		if (!cancelledOrder) throw new BadRequestException('Order status changed before cancellation. Refresh and try again.');

		await Promise.all(order.items.map((item) =>
			this.productModel.updateOne({ _id: item.productId }, { $inc: { stock: item.quantity } }).exec(),
		));

		const event = { orderId: order._id, status: 'CANCELLED' };
		void this.notificationsService.createAndSend({
			recipientId: customerId,
			type: 'ORDER_STATUS_UPDATED',
			title: 'Order Cancelled',
			message: `Your order #${order._id} was cancelled.`,
			data: event,
		}).catch(() => undefined);
		this.notificationsService.emitLiveEvent({ userId: customerId }, 'order:status_updated', event);
		this.notificationsService.emitLiveEvent({ userId: customerId }, 'dashboard:refresh:customer', event);
		this.notificationsService.emitLiveEvent({ role: UserRole.ADMIN, broadcast: true }, 'dashboard:refresh:admin', event);
		this.notificationsService.emitLiveEvent({ role: UserRole.SELLER, broadcast: true }, 'dashboard:refresh:seller', event);
		return cancelledOrder;
	}

	private normalizeOrderStatus(status: string) {
		const normalized = (status || '').toUpperCase();
		if (normalized === 'SHIPPED') return 'OUT_FOR_DELIVERY';
		if (normalized === 'RETURNIG') return 'RETURNING';
		return normalized;
	}

	async listMine(customerId: string, from?: Date, to?: Date) {
		const filter: any = { customerId };
		if (from && to) {
			filter.createdAt = { $gte: from, $lte: to };
		}
		return this.orderModel.find(filter).sort({ createdAt: -1 }).exec();
	}

	async listSellerOrders(sellerId: string) {
		const sellerUuid = sellerId;
		const products = await this.productModel.find({ sellerId: sellerUuid }).select('_id').exec();
		const productIds = new Set(products.map((product) => product._id.toString()));
		if (!productIds.size) return [];

		const orders = await this.orderModel.find({ status: { $ne: 'PAYMENT_PENDING' }, 'items.productId': { $in: [...productIds] } })
			.sort({ createdAt: -1 })
			.exec();

		return orders.map((order) => {
			const sellerItems = order.items.filter((item) => productIds.has(item.productId.toString()));
			return {
				...order.toObject(),
				items: sellerItems,
				total: sellerItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
			};
		});
	}

	async getSellerStats(sellerId: string, from: Date, to: Date) {
		const sellerUuid = sellerId;
		const products = await this.productModel.find({ sellerId: sellerUuid }).select('_id').exec();
		const productIds = products.map((product) => product._id);
		const orders = productIds.length
			? await this.orderModel.find({
				status: { $ne: 'PAYMENT_PENDING' },
				createdAt: { $gte: from, $lte: to },
				'items.productId': { $in: productIds },
			}).select('status paymentMethod createdAt').exec()
			: [];

		const statuses = {
			PENDING: 0,
			CONFIRMED: 0,
			PREPARING: 0,
			OUT_FOR_DELIVERY: 0,
			DELIVERED: 0,
			EXCHANGING: 0,
			RETURNING: 0,
		};
		const paymentMethods = {
			CASH_ON_DELIVERY: 0,
			BANK_CARD: 0,
		};
		const byDay = new Map<string, {
			date: string;
			total: number;
			statuses: typeof statuses;
			paymentMethods: typeof paymentMethods;
		}>();

		for (const order of orders) {
			const rawStatus = (order.status || '').toUpperCase();
			const status = rawStatus === 'SHIPPED' ? 'OUT_FOR_DELIVERY'
				: rawStatus === 'RETURNIG' ? 'RETURNING'
				: rawStatus;
			if (status in statuses) statuses[status as keyof typeof statuses] += 1;
			if (order.paymentMethod in paymentMethods) {
				paymentMethods[order.paymentMethod as keyof typeof paymentMethods] += 1;
			}

			const date = businessDateKey(new Date(order.createdAt));
			const day = byDay.get(date) ?? {
				date,
				total: 0,
				statuses: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, OUT_FOR_DELIVERY: 0, DELIVERED: 0, EXCHANGING: 0, RETURNING: 0 },
				paymentMethods: { CASH_ON_DELIVERY: 0, BANK_CARD: 0 },
			};
			day.total += 1;
			if (status in day.statuses) day.statuses[status as keyof typeof day.statuses] += 1;
			if (order.paymentMethod in day.paymentMethods) {
				day.paymentMethods[order.paymentMethod as keyof typeof day.paymentMethods] += 1;
			}
			byDay.set(date, day);
		}

		const outOfStockItems = await this.productModel.find({
			sellerId: sellerUuid,
			stock: { $lte: 0 },
		}).select('_id name price stock images').exec();

		return {
			statuses,
			paymentMethods,
			finishedStockProducts: outOfStockItems.length,
			outOfStockItems,
			daily: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
		};
	}

	async getAdminStats(from: Date, to: Date) {
		const orders = await this.orderModel.find({
			status: { $ne: 'PAYMENT_PENDING' },
			createdAt: { $gte: from, $lte: to },
		}).select('status paymentMethod total createdAt items').exec();

		const statuses = {
			PENDING: 0,
			CONFIRMED: 0,
			PREPARING: 0,
			OUT_FOR_DELIVERY: 0,
			DELIVERED: 0,
			EXCHANGING: 0,
			RETURNING: 0,
			CANCELLED: 0,
		};
		const paymentMethods = {
			CASH_ON_DELIVERY: 0,
			BANK_CARD: 0,
		};
		let totalRevenue = 0;
		const byDay = new Map<string, {
			date: string;
			totalOrders: number;
			revenue: number;
			statuses: typeof statuses;
			paymentMethods: typeof paymentMethods;
		}>();

		for (const order of orders) {
			const rawStatus = (order.status || '').toUpperCase();
			const status = rawStatus === 'SHIPPED' ? 'OUT_FOR_DELIVERY'
				: rawStatus === 'RETURNIG' ? 'RETURNING'
				: rawStatus;
			if (status in statuses) statuses[status as keyof typeof statuses] += 1;
			if (order.paymentMethod in paymentMethods) {
				paymentMethods[order.paymentMethod as keyof typeof paymentMethods] += 1;
			}
			if (status === 'DELIVERED') {
				totalRevenue += order.total || 0;
			}

			const date = businessDateKey(new Date(order.createdAt));
			const day = byDay.get(date) ?? {
				date,
				totalOrders: 0,
				revenue: 0,
				statuses: { PENDING: 0, CONFIRMED: 0, PREPARING: 0, OUT_FOR_DELIVERY: 0, DELIVERED: 0, EXCHANGING: 0, RETURNING: 0, CANCELLED: 0 },
				paymentMethods: { CASH_ON_DELIVERY: 0, BANK_CARD: 0 },
			};
			day.totalOrders += 1;
			if (status === 'DELIVERED') {
				day.revenue += order.total || 0;
			}
			if (status in day.statuses) day.statuses[status as keyof typeof day.statuses] += 1;
			if (order.paymentMethod in day.paymentMethods) {
				day.paymentMethods[order.paymentMethod as keyof typeof day.paymentMethods] += 1;
			}
			byDay.set(date, day);
		}

		const totalProducts = await this.productModel.countDocuments().exec();
		const outOfStockProducts = await this.productModel.countDocuments({ stock: { $lte: 0 } }).exec();

		return {
			totalOrders: orders.length,
			totalRevenue,
			statuses,
			paymentMethods,
			totalProducts,
			outOfStockProducts,
			daily: [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date)),
		};
	}

	async getAdminRecentOrders(limit: number = 10) {
		return this.orderModel.find({ status: { $ne: 'PAYMENT_PENDING' } })
			.populate('customerId', 'fullname email username')
			.sort({ createdAt: -1 })
			.limit(limit)
			.exec();
	}
}
