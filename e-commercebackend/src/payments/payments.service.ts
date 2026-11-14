import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SimulateCardPaymentDto } from './dto/simulate-card-payment.dto';
import { OrdersService } from '../orders/orders.service';
import { OrderPaymentMethod } from '../orders/dto/create-order.dto';

type SimulatedCardAccount = { cvv: string; balance: number; enabled: boolean };

@Injectable()
export class PaymentsService {
	// Entirely fictional test accounts. Balances live only in memory and reset when the API restarts.
	private readonly cards = new Map<string, SimulatedCardAccount>([
		['4242424242424242', { cvv: '123', balance: 1000, enabled: true }],
		['4000000000009995', { cvv: '123', balance: 20, enabled: true }],
		['4000000000000002', { cvv: '123', balance: 1000, enabled: false }],
	]);

	constructor(private readonly orders: OrdersService) {}

	async simulateCardPayment(customerId: string, dto: SimulateCardPaymentDto) {
		if (process.env.NODE_ENV === 'production') {
			throw new ServiceUnavailableException('The local payment simulator is disabled in production.');
		}

		const digits = dto.cardNumber.replace(/\s/g, '');
		if (digits.length < 12 || digits.length > 19 || !this.passesLuhn(digits)) {
			throw new BadRequestException('Card number format is invalid');
		}
		const expiry = new Date(dto.expiryYear, dto.expiryMonth, 0, 23, 59, 59, 999);
		if (expiry.getTime() < Date.now()) throw new BadRequestException('Card has expired');
		if (dto.paymentMethod !== 'BANK_CARD') throw new BadRequestException('Card simulation requires BANK_CARD payment method');

		// Create the order and reserve inventory using server-side product prices.
		const order = await this.orders.create(customerId, { ...dto, paymentMethod: OrderPaymentMethod.BANK_CARD }, true);
		const card = this.cards.get(digits);
		let outcome: 'PAID' | 'FAILED' = 'FAILED';
		let message: string;
		let reference: string | null = null;

		if (!card) {
			message = 'This test card is not registered in the local simulator.';
		} else if (card.cvv !== dto.cvv) {
			message = 'Card security code is incorrect.';
		} else if (!card.enabled) {
			message = 'The simulated bank declined this card.';
		} else if (card.balance < order.total) {
			message = `Insufficient simulated balance. Available: ${card.balance.toFixed(2)} TND.`;
		} else {
			card.balance = Math.round((card.balance - order.total) * 100) / 100;
			outcome = 'PAID';
			reference = `SIM-${randomUUID()}`;
			message = `Simulated approval. Remaining test balance: ${card.balance.toFixed(2)} TND.`;
		}

		try {
			const updatedOrder = await this.orders.markSimulatedPayment(order._id, outcome, reference);
			return { order: updatedOrder, approved: outcome === 'PAID', reference, message };
		} catch (error) {
			if (outcome === 'PAID' && card) card.balance = Math.round((card.balance + order.total) * 100) / 100;
			await this.orders.markSimulatedPayment(order._id, 'FAILED');
			throw error;
		}
	}

	private passesLuhn(number: string) {
		let sum = 0;
		let doubleDigit = false;
		for (let index = number.length - 1; index >= 0; index -= 1) {
			let digit = Number(number[index]);
			if (doubleDigit) {
				digit *= 2;
				if (digit > 9) digit -= 9;
			}
			sum += digit;
			doubleDigit = !doubleDigit;
		}
		return sum % 10 === 0;
	}
}
