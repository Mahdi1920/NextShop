import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsUUID, IsNotEmpty, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class CreateExchangeRequestItemDto {
	@IsUUID('4')
	originalProductId: string;

	@IsUUID('4')
	replacementProductId: string;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	quantity: number;
}

export class CreateExchangeRequestDto {
	@IsString()
	@IsNotEmpty()
	@MaxLength(1000)
	reason: string;

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateExchangeRequestItemDto)
	items: CreateExchangeRequestItemDto[];
}
