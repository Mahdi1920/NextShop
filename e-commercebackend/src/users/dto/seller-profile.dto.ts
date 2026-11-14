import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIBAN,
  IsBIC,
  IsOptional,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsString,
  IsUrl,
  IsInt,
  Length,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { SellerStatus } from '../../common/enums/seller-status.enum';
import { PaymentMethod } from '../../common/enums/paymentMethod.enum';
import { IdentityDocumentType } from '../../common/enums/identity-document-type.enum';
import { Transform, Type } from 'class-transformer';

const IsProvided = (_object: unknown, value: unknown) =>
  value !== undefined && value !== null && value !== '';
const TrimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const NormalizeEmail = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class IdentityDocumentDto {
  @IsOptional()
  @IsEnum(IdentityDocumentType)
  type?: IdentityDocumentType;

  @IsOptional()
  @IsUrl()
  fileUrl?: string;
}

export class BusinessRegistrationDto {
  @IsOptional()
  @IsUrl()
  documentUrl?: string;

  @ValidateIf(IsProvided)
  @Transform(TrimString)
  @IsString()
  @Length(1, 100)
  @Matches(/\S/, { message: 'registrationNumber must not be empty' })
  registrationNumber?: string;
}

export class BankInfoDto {
  @ValidateIf(IsProvided)
  @Transform(TrimString)
  @IsString()
  @Length(1, 100)
  bankName?: string;

  @ValidateIf(IsProvided)
  @Transform(TrimString)
  @IsString()
  @Length(1, 100)
  accountHolder?: string;

  @ValidateIf(IsProvided)
  @Transform(TrimString)
  @IsString()
  @IsIBAN({ message: 'iban must be a valid IBAN' })
  iban?: string;

  @ValidateIf(IsProvided)
  @Transform(TrimString)
  @IsString()
  @IsBIC({ message: 'swift must be a valid 8 or 11 character SWIFT/BIC code' })
  swift?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

export class SellerProfileDto {
  @ValidateIf(IsProvided)
  @Transform(TrimString)
  @IsString()
  @Length(1, 100)
  @Matches(/\S/, { message: 'shopName must not be empty' })
  shopName?: string;

  @ValidateIf(IsProvided)
  @Transform(TrimString)
  @IsString()
  @Length(1, 100)
  shopSlug?: string;

  @ValidateIf(IsProvided)
  @Transform(TrimString)
  @IsString()
  @Length(1, 2000)
  description?: string;

  @IsOptional()
  @IsUrl()
  logo?: string;

  @IsOptional()
  @IsUrl()
  banner?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  nbBanned?: number;

  @ValidateIf(IsProvided)
  @Transform(NormalizeEmail)
  @IsString()
  @Length(1, 254)
  @IsEmail()
  @Matches(/^[\x00-\x7F]+$/, { message: 'businessEmail must use English characters' })
  businessEmail?: string;

  @ValidateIf(IsProvided)
  @Transform(TrimString)
  @IsString()
  @Matches(/^\d{8,15}$/, {
    message: 'businessPhone must contain only digits (8 to 15 digits)',
  })
  businessPhone?: string;

  @IsOptional()
  @Transform(TrimString)
  @IsString()
  @Length(1, 1000)
  @Matches(/\S/, { message: 'businessAddress must not be empty' })
  businessAddress?: string;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @Transform(({ value }) => Array.isArray(value) ? value.map((item) => typeof item === 'string' ? item.trim() : item) : value)
  @IsString({ each: true })
  @Matches(/\S/, { each: true, message: 'each business address must not be empty' })
  @Length(1, 1000, { each: true })
  businessAddresses?: string[];

  @IsOptional()
  @IsEnum(SellerStatus)
  status?: SellerStatus;

  @IsOptional()
  @IsBoolean()
  verified?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => IdentityDocumentDto)
  identityDocument?: IdentityDocumentDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => BusinessRegistrationDto)
  businessRegistration?: BusinessRegistrationDto;

  @IsOptional()
  @IsUrl()
  companyRegistrationCertificateUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => BankInfoDto)
  bankInfo?: BankInfoDto;
}
