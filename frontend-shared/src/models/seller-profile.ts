import type { IdentityDocumentType, PaymentMethod, SellerStatus } from "@shared/enums";

export type SellerProfile = {
  shopName?: string;
  shopSlug?: string;
  description?: string;
  logo?: string;
  banner?: string;
  nbBanned?: number;
  businessEmail?: string;
  businessPhone?: string;
  businessAddress?: string;
  status?: SellerStatus;
  verified?: boolean;
  identityDocument?: {
    type?: IdentityDocumentType;
    fileUrl?: string;
  };
  businessRegistration?: {
    registrationNumber?: string;
    documentUrl?: string;
  };
  companyRegistrationCertificateUrl?: string;
  bankInfo?: {
    bankName?: string;
    accountHolder?: string;
    iban?: string;
    swift?: string;
    paymentMethod?: PaymentMethod;
  };
  documents?: string[];
  rejectionReason?: string;
  reviewedAt?: string;
};
