import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'node:crypto';

export type OrderDocument = Order & Document;

@Schema({ _id: false })
export class OrderItem {
	@Prop({ type: String, ref: 'Product', required: true })
	productId: string;
	@Prop({ type: String, ref: 'User' }) sellerId?: string;
	@Prop({ type: String, ref: 'Category' }) categoryId?: string;
	@Prop({ required: true }) name: string;
	@Prop({ required: true, min: 0 }) price: number;
	@Prop({ required: true, min: 1 }) quantity: number;
	@Prop({ type: [String], default: [] }) images: string[];
}
export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ _id: false })
export class ExchangeRequestItem {
	@Prop({ type: String, required: true }) originalProductId: string;
	@Prop({ required: true }) originalName: string;
	@Prop({ type: String, required: true }) replacementProductId: string;
	@Prop({ required: true }) replacementName: string;
	@Prop({ type: String, required: true }) replacementCategoryId: string;
	@Prop({ required: true, min: 0 }) replacementPrice: number;
	@Prop({ required: true, min: 1 }) quantity: number;
}
export const ExchangeRequestItemSchema = SchemaFactory.createForClass(ExchangeRequestItem);

@Schema({ _id: false })
export class ExchangeStatusHistoryItem {
	@Prop({ required: true }) status: string;
	@Prop({ required: true, default: Date.now }) changedAt: Date;
	@Prop({ type: String }) changedBy?: string;
}
export const ExchangeStatusHistoryItemSchema = SchemaFactory.createForClass(ExchangeStatusHistoryItem);

@Schema({ _id: false })
export class ExchangeRequest {
	@Prop({ required: true }) reason: string;
	@Prop({ type: [ExchangeRequestItemSchema], required: true }) items: ExchangeRequestItem[];
	@Prop({ required: true, default: Date.now }) requestedAt: Date;
	@Prop({ required: true, default: 'REQUESTED', enum: ['REQUESTED', 'REJECTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'EXCHANGED', 'RETURNING', 'RETURNED'] }) status: string;
	@Prop({ type: [ExchangeStatusHistoryItemSchema], default: [] }) history: ExchangeStatusHistoryItem[];
}
export const ExchangeRequestSchema = SchemaFactory.createForClass(ExchangeRequest);

@Schema({ timestamps: true })
export class Order {
	@Prop({ type: String, default: () => randomUUID() })
	_id: string;
	@Prop({ type: String, ref: 'User', required: true, index: true })
	customerId: string;
	@Prop({ type: [OrderItemSchema], required: true }) items: OrderItem[];
	@Prop({ min: 0 }) deliveryCost?: number;
	@Prop({ required: true, min: 0 }) total: number;
	@Prop({ required: true }) deliveryAddress: string;
	@Prop({ required: true }) phone: string;
	@Prop({ required: true, enum: ['CASH_ON_DELIVERY', 'BANK_CARD'] }) paymentMethod: string;
	@Prop({ required: true, default: 'PENDING', enum: ['PAYMENT_PENDING', 'PENDING', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCHANGING', 'RETURNING', 'RETURNIG', 'CONFIRMED', 'SHIPPED', 'CANCELLED'] })
	status: string;
	@Prop({ enum: ['PENDING', 'PAID', 'FAILED', 'CANCELLED'] }) paymentStatus?: string;
	@Prop() paymentProvider?: string;
	@Prop() paymentTransactionId?: string;
	@Prop() paymentFailureRestocked?: boolean;
	@Prop() deliveredAt?: Date;
	@Prop({ type: ExchangeRequestSchema }) exchangeRequest?: ExchangeRequest;

	createdAt: Date;
	updatedAt: Date;
}
export const OrderSchema = SchemaFactory.createForClass(Order);
