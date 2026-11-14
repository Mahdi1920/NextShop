// Client/customer-facing user endpoints.

import { apiClient } from "@shared/api/clients";
import type { User } from "@shared/api/users";

export type ClientUserProfile = {
  fullname: string;
  email: string;
  username: string;
  address?: string;
  phone?: string;
  avatar?: string;
};

export type UpdateMeInput = Partial<Pick<ClientUserProfile, "fullname" | "username" | "address" | "phone" | "avatar">>;

export type UpdateSellerStoreInput = Partial<{
  shopName: string;
  description: string;
  logo: string;
  banner: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
}>;

export const clientsApi = {
  async me(): Promise<User> {
    const res = await apiClient.get<User>("/users/me");
    return res.data;
  },

  async updateMe(input: UpdateMeInput): Promise<User> {
    const res = await apiClient.put<User>("/users/me", input);
    return res.data;
  },

  async updateMyStore(input: UpdateSellerStoreInput): Promise<User> {
    const res = await apiClient.put<User>("/users/me/store", input);
    return res.data;
  },
};
