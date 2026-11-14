import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Matches, Max, Min } from 'class-validator';
import { CreateOrderDto } from '../../orders/dto/create-order.dto';

export class SimulateCardPaymentDto extends CreateOrderDto {
	@IsString()
	@Length(2, 100)
	cardholder: string;

	@IsString()
	@Matches(/^[0-9 ]{12,23}$/)
	cardNumber: string;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(12)
	expiryMonth: number;

	@Type(() => Number)
	@IsInt()
	@Min(2000)
	@Max(2100)
	expiryYear: number;

	@IsString()
	@Matches(/^\d{3,4}$/)
	cvv: string;
}
