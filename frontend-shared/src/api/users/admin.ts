import { authApi, type SellerProfileInput } from "@shared/api/auth";
import { apiClient } from "@shared/api/clients";
import type { UserRole } from "@shared/enums";
import type { SellerProfile } from "@shared/models/seller-profile";
import type { User } from "@shared/models/user";

export type { UserRole } from "@shared/enums";
export type { SellerProfile } from "@shared/models/seller-profile";
export type { User } from "@shared/models/user";

export type CreateUserInput = {
  fullname: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  phone?: string;
  address?: string;
  avatar?: string;
  sellerProfile?: SellerProfileInput;
};

export type UpdateUserInput = {
  fullname: string;
  email: string;
  username: string;
  password?: string;
  role: UserRole;
  isActive: boolean;
  phone?: string;
  address?: string;
  avatar?: string;
  sellerProfile?: Partial<SellerProfileInput>;
};

export type SellerDocumentReview = {
  summary: string;
  recommendation: "LOOKS_COMPLETE" | "NEEDS_REVIEW" | "ISSUES_FOUND";
  checks: Array<{
    document: string;
    documentType: "IDENTITY_DOCUMENT" | "BUSINESS_REGISTRATION" | "COMPANY_CERTIFICATE" | "OTHER" | "UNREADABLE";
    extractedSellerName: string;
    sellerNameStatus: "MATCH" | "MISMATCH" | "UNREADABLE" | "NOT_PRESENT";
    extractedRegistrationNumber: string;
    registrationNumberStatus: "MATCH" | "MISMATCH" | "UNREADABLE" | "NOT_PRESENT" | "NOT_APPLICABLE";
    notes: string;
  }>;
  findings: Array<{
    document: string;
    severity: "INFO" | "WARNING" | "HIGH";
    issue: string;
    nextStep: string;
  }>;
};

function normalizeId(user: User): string | null {
  return user._id ?? user.id ?? null;
}

export const usersApi = {
  async connectedCount(): Promise<number> {
    const res = await apiClient.get<{ count: number }>("/users/presence/online-count");
    return res.data.count;
  },

  async list(): Promise<User[]> {
    const res = await apiClient.get<User[]>("/users");
    return res.data;
  },

  async listPendingSellers(): Promise<User[]> {
    const res = await apiClient.get<User[]>("/users/sellers/pending");
    return res.data;
  },

  async reviewSellerDocuments(userId: string, documentUrls: string[]): Promise<SellerDocumentReview> {
    const res = await apiClient.post<SellerDocumentReview>(
      `/users/sellers/${encodeURIComponent(userId)}/document-review`,
      { documentUrls },
    );
    return res.data;
  },

  async approveSeller(userId: string): Promise<User> {
    const res = await apiClient.patch<User>(
      `/users/sellers/${encodeURIComponent(userId)}/approve`,
    );
    return res.data;
  },

  async rejectSeller(userId: string, reason: string): Promise<User> {
    const res = await apiClient.patch<User>(
      `/users/sellers/${encodeURIComponent(userId)}/reject`,
      { reason },
    );
    return res.data;
  },

  create(input: CreateUserInput): Promise<{ message: string }> {
    return authApi.register({
      fullname: input.fullname,
      email: input.email,
      username: input.username,
      password: input.password,
      role: input.role,
      phone: input.phone || undefined,
      address: input.address || undefined,
      avatar: input.avatar || undefined,
      sellerProfile: input.sellerProfile,
    });
  },

  update(user: User, input: UpdateUserInput): Promise<User> {
    const id = normalizeId(user);
    if (!id) {
      return Promise.reject(new Error("Cannot update: user id not found"));
    }

    return apiClient
      .put<User>(`/users/${id}`, {
        fullname: input.fullname,
        email: input.email,
        username: input.username,
        ...(input.password ? { password: input.password } : null),
        role: input.role,
        isActive: input.isActive,
        phone: input.phone || undefined,
        address: input.address || undefined,
        avatar: input.avatar || undefined,
        sellerProfile: input.sellerProfile,
      })
      .then((r) => r.data);
  },

  remove(user: User): Promise<void> {
    const id = normalizeId(user);
    if (!id) {
      return Promise.reject(new Error("Cannot delete: user id not found"));
    }

    return apiClient.delete<void>(`/users/${id}`).then(() => undefined);
  },
};

