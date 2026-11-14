import { apiClient } from "@shared/api/clients";
import type {
  ActivateResponse,
  ForgotPasswordResponse,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  ResetPasswordResponse,
  SellerProfileInput,
} from "@shared/models/auth";

export type { IdentityDocumentType } from "@shared/enums";
export type {
  ActivateResponse,
  ForgotPasswordResponse,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  ResetPasswordResponse,
  SellerProfileInput,
} from "@shared/models/auth";

export const authApi = {
  async login(input: LoginInput): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>("/auth/login", input);
    return res.data;
  },

  async register(input: RegisterInput): Promise<RegisterResponse> {
    const res = await apiClient.post<RegisterResponse>("/auth/register", input);
    return res.data;
  },

  async registerFormData(formData: FormData): Promise<RegisterResponse> {
    const res = await apiClient.post<RegisterResponse>("/auth/register", formData);
    return res.data;
  },

  async activate(token: string): Promise<ActivateResponse> {
    const safe = encodeURIComponent(token);
    const res = await apiClient.get<ActivateResponse>(`/auth/activate/${safe}`);
    return res.data;
  },

  async forgotPassword(email: string): Promise<ForgotPasswordResponse> {
    const res = await apiClient.post<ForgotPasswordResponse>("/auth/forgot-password", {
      email,
    });
    return res.data;
  },

  async resetPassword(token: string, newPassword: string): Promise<ResetPasswordResponse> {
    const safe = encodeURIComponent(token);
    const res = await apiClient.post<ResetPasswordResponse>(
      `/auth/reset-password/${safe}`,
      { newPassword },
    );
    return res.data;
  },
};
