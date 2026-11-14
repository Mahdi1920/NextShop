import { IsEnum } from 'class-validator';

export enum ExchangeRequestStatus {
	REQUESTED = 'REQUESTED',
	REJECTED = 'REJECTED',
	PREPARING = 'PREPARING',
	OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
	EXCHANGED = 'EXCHANGED',
	RETURNING = 'RETURNING',
	RETURNED = 'RETURNED',
}

export class UpdateExchangeStatusDto {
	@IsEnum(ExchangeRequestStatus)
	status: ExchangeRequestStatus;
}
