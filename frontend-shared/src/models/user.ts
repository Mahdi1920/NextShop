import type { UserRole } from "@shared/enums";
import type { SellerProfile } from "./seller-profile";

export type User = {
  _id?: string;
  id?: string;
  fullname: string;
  email: string;
  username: string;
  role?: UserRole;
  address?: string;
  phone?: string;
  avatar?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  nbBanned?: number;
  sellerProfile?: SellerProfile | null;
  createdAt?: string;
  updatedAt?: string;
};
