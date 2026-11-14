import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { randomUUID } from 'node:crypto';
import { UserRole } from '../../common/enums/role.enum';
import { SellerStatus } from '../../common/enums/seller-status.enum';
import { PaymentMethod } from '../../enums';
import { IdentityDocumentType } from '../../common/enums/identity-document-type.enum';

export type UserDocument = User & Document;

@Schema({ _id: false })
export class IdentityDocument {
  @Prop({ enum: IdentityDocumentType })
  type?: IdentityDocumentType;

  @Prop()
  fileUrl?: string;
}

export const IdentityDocumentSchema = SchemaFactory.createForClass(IdentityDocument);

@Schema({ _id: false })
export class BusinessRegistration {
  @Prop()
  documentUrl?: string;

  @Prop()
  registrationNumber?: string;
}

export const BusinessRegistrationSchema = SchemaFactory.createForClass(BusinessRegistration);

@Schema({ _id: false })
export class BankInfo {
  @Prop()
  bankName?: string;

  @Prop()
  accountHolder?: string;

  @Prop()
  iban?: string;

  @Prop()
  swift?: string;

  @Prop({ enum: PaymentMethod })
  paymentMethod?: PaymentMethod;
}

export const BankInfoSchema = SchemaFactory.createForClass(BankInfo);

@Schema({ _id: false })
export class SellerProfile {
  @Prop() shopName?: string;
  @Prop() shopSlug?: string;
  @Prop() description?: string;
  @Prop() logo?: string;
  @Prop() banner?: string;
  @Prop() businessEmail?: string;
  @Prop() businessPhone?: string;
  @Prop() businessAddress?: string;
  @Prop({ type: [String], default: [] }) businessAddresses?: string[];

  @Prop({ enum: SellerStatus, default: SellerStatus.PENDING })
  status?: SellerStatus;

  @Prop({ default: false })
  verified?: boolean;

  @Prop() verifiedAt?: Date;

  @Prop({ type: [String], default: [] })
  documents?: string[];

  @Prop({ type: IdentityDocumentSchema, default: null })
  identityDocument?: IdentityDocument | null;

  @Prop({ type: BusinessRegistrationSchema, default: null })
  businessRegistration?: BusinessRegistration | null;

  // Company registration certificate OR “auto-entrepreneur” document
  @Prop()
  companyRegistrationCertificateUrl?: string;

  @Prop({ type: BankInfoSchema, default: null })
  bankInfo?: BankInfo | null;

  @Prop() rejectionReason?: string;

  @Prop() reviewedAt?: Date;
}

export const SellerProfileSchema = SchemaFactory.createForClass(SellerProfile);

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, default: () => randomUUID() })
  _id: string;

  @Prop({ required: true }) fullname: string;
  @Prop({ required: true, unique: true }) email: string;
  @Prop({ required: true }) username: string;
  @Prop({ required: true }) password: string;
  @Prop({ enum: UserRole, default: UserRole.CUSTOMER }) role: UserRole;
  @Prop({ default: '' }) address: string;
  @Prop({ type: [String], default: [] }) addresses: string[];
  @Prop({ default: '' }) phone: string;
  @Prop({ default: '' }) avatar: string;
  @Prop({ required: true }) isActive: boolean;
  @Prop({ default: false }) isBlocked: boolean;
  @Prop({ type: Date }) lastSeenAt?: Date;
  @Prop({ default: 0 }) nbBanned: number;
  @Prop({ type: SellerProfileSchema, default: null })
  sellerProfile?: SellerProfile | null;
  @Prop({ type: [String], default: [] }) wishlist: string[];
  @Prop({ type: [String], default: [] }) orders: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);
