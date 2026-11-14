import type { IdentityDocumentType, PaymentMethod, UserRole } from "@shared/enums";
import type { User } from "./user";

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  user: User;
};

export type SellerProfileInput = {
  shopName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  businessAddresses: string[];
  identityDocument: {
    type: IdentityDocumentType;
  };
  businessRegistration: {
    registrationNumber: string;
  };
  bankInfo: {
    bankName?: string;
    accountHolder: string;
    iban: string;
    swift?: string;
    paymentMethod?: PaymentMethod;
  };
};

export type RegisterInput = {
  fullname: string;
  username: string;
  email: string;
  password: string;
  role?: UserRole;
  address?: string;
  addresses?: string[];
  phone?: string;
  avatar?: string;
  sellerProfile?: SellerProfileInput;
};

export type RegisterResponse = { message: string };
export type ForgotPasswordResponse = { message: string };
export type ResetPasswordResponse = { message: string };
export type ActivateResponse = { message: string };

