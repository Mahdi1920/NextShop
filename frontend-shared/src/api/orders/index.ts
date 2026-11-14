import { apiClient } from "@shared/api/clients";
import { OrderStatus, PaymentMethod } from "@shared/enums";

export type CreateOrderInput = {
  items: Array<{ productId: string; quantity: number }>;
  deliveryAddress: string;
  phone: string;
  paymentMethod: PaymentMethod | "CASH_ON_DELIVERY" | "BANK_CARD";
};

export type Order = {
  _id: string;
  items: Array<{ productId: string; sellerId?: string; categoryId?: string; name: string; price: number; quantity: number; images: string[] }>;
  deliveryCost?: number;
  total: number;
  deliveryAddress: string;
  phone: string;
  paymentMethod: CreateOrderInput["paymentMethod"];
  paymentStatus?: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  paymentProvider?: string;
  paymentTransactionId?: string;
  status: OrderStatus | string;
  createdAt: string;
  updatedAt?: string;
  deliveredAt?: string;
  exchangeRequest?: {
    reason: string;
    requestedAt: string;
    status?: string;
    history?: Array<{ status: string; changedAt: string; changedBy?: string }>;
    items: Array<{
      originalProductId: string;
      originalName: string;
      replacementProductId: string;
      replacementName: string;
      replacementCategoryId: string;
      replacementPrice: number;
      quantity: number;
    }>;
  };
};

export type CreateExchangeRequestInput = {
  reason: string;
  items: Array<{ originalProductId: string; replacementProductId: string; quantity: number }>;
};

export type SellerOrder = Order & {
  customerId: string;
};

export type SellerStatsDaily = {
  date: string;
  total: number;
  statuses: {
    PENDING: number;
    CONFIRMED: number;
    PREPARING: number;
    OUT_FOR_DELIVERY: number;
    DELIVERED: number;
    EXCHANGING: number;
    RETURNING: number;
  };
  paymentMethods: {
    CASH_ON_DELIVERY: number;
    BANK_CARD: number;
  };
};

export type SellerOutOfStockItem = {
  _id: string;
  name: string;
  price: number;
  stock: number;
  images?: string[];
};

export type SellerStatsResponse = {
  statuses: {
    PENDING: number;
    CONFIRMED: number;
    PREPARING: number;
    OUT_FOR_DELIVERY: number;
    DELIVERED: number;
    EXCHANGING: number;
    RETURNING: number;
  };
  paymentMethods: {
    CASH_ON_DELIVERY: number;
    BANK_CARD: number;
  };
  finishedStockProducts: number;
  outOfStockItems?: SellerOutOfStockItem[];
  daily: SellerStatsDaily[];
};

export type AdminDailyStats = {
  date: string;
  totalOrders: number;
  revenue: number;
  statuses: {
    PENDING: number;
    CONFIRMED: number;
    PREPARING: number;
    OUT_FOR_DELIVERY: number;
    DELIVERED: number;
    EXCHANGING: number;
    RETURNING: number;
    CANCELLED: number;
  };
  paymentMethods: {
    CASH_ON_DELIVERY: number;
    BANK_CARD: number;
  };
};

export type AdminStatsResponse = {
  totalOrders: number;
  totalRevenue: number;
  statuses: {
    PENDING: number;
    CONFIRMED: number;
    PREPARING: number;
    OUT_FOR_DELIVERY: number;
    DELIVERED: number;
    EXCHANGING: number;
    RETURNING: number;
    CANCELLED: number;
  };
  paymentMethods: {
    CASH_ON_DELIVERY: number;
    BANK_CARD: number;
  };
  totalProducts: number;
  outOfStockProducts: number;
  daily: AdminDailyStats[];
};

export type AdminOrder = Order & {
  customerId?: {
    _id: string;
    fullname: string;
    email: string;
    username: string;
  };
};

export const ordersApi = {
  async create(input: CreateOrderInput): Promise<Order> {
    const response = await apiClient.post<Order>("/orders", input);
    return response.data;
  },
  async listMine(params?: { from?: string; to?: string }): Promise<Order[]> {
    const response = await apiClient.get<Order[]>("/orders/me", { params });
    return response.data;
  },
  async updateStatus(orderId: string, status: string): Promise<Order> {
    const response = await apiClient.patch<Order>(`/orders/${orderId}/status`, { status });
    return response.data;
  },
  async cancelMine(orderId: string): Promise<Order> {
    const response = await apiClient.patch<Order>(`/orders/${orderId}/cancel`);
    return response.data;
  },
  async requestExchange(orderId: string, input: CreateExchangeRequestInput): Promise<Order> {
    const response = await apiClient.post<Order>(`/orders/${orderId}/exchange-request`, input);
    return response.data;
  },
  async updateExchangeStatus(orderId: string, status: string): Promise<Order> {
    const response = await apiClient.patch<Order>(`/orders/${orderId}/exchange-status`, { status });
    return response.data;
  },
  async listSellerOrders(): Promise<SellerOrder[]> {
    const response = await apiClient.get<SellerOrder[]>("/orders/seller");
    return response.data;
  },
  async getSellerStats(params: { from: string; to: string }): Promise<SellerStatsResponse> {
    const response = await apiClient.get<SellerStatsResponse>("/orders/seller/stats", {
      params,
    });
    return response.data;
  },
  async getAdminStats(params: { from: string; to: string }): Promise<AdminStatsResponse> {
    const response = await apiClient.get<AdminStatsResponse>("/orders/admin/stats", {
      params,
    });
    return response.data;
  },
  async getAdminRecentOrders(limit: number = 10): Promise<AdminOrder[]> {
    const response = await apiClient.get<AdminOrder[]>("/orders/admin/recent", {
      params: { limit },
    });
    return response.data;
  },
};
