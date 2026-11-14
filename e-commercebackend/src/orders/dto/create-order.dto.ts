import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsInt, IsUUID, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';

export enum OrderPaymentMethod {
	CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
	BANK_CARD = 'BANK_CARD',
}

export class CreateOrderItemDto {
	@IsUUID('4')
	productId: string;
	@Type(() => Number)
	@IsInt()
	@Min(1)
	quantity: number;
}

export class CreateOrderDto {
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateOrderItemDto)
	items: CreateOrderItemDto[];
	@IsString()
	@IsNotEmpty()
	deliveryAddress: string;
	@IsString()
	@IsNotEmpty()
	phone: string;
	@IsEnum(OrderPaymentMethod)
	paymentMethod: OrderPaymentMethod;
}
