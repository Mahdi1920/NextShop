import { apiClient } from "@shared/api/clients";
import type { Order } from "@shared/api/orders";

export type SimulatedCardPaymentInput = {
  items: Array<{ productId: string; quantity: number }>;
  deliveryAddress: string;
  phone: string;
  paymentMethod: "BANK_CARD";
  cardholder: string;
  cardNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cvv: string;
};

export type SimulatedCardPaymentResult = {
  order: Order & { paymentStatus: string; paymentTransactionId?: string };
  approved: boolean;
  reference: string | null;
  message: string;
};

export const paymentsApi = {
  async simulateCardPayment(input: SimulatedCardPaymentInput): Promise<SimulatedCardPaymentResult> {
    const response = await apiClient.post<SimulatedCardPaymentResult>("/payments/simulate/card", input);
    return response.data;
  },
};
