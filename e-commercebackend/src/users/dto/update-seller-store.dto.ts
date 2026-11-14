import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateSellerStoreDto {
  @IsOptional()
  @IsString()
  shopName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUrl()
  logo?: string;

  @IsOptional()
  @IsUrl()
  banner?: string;

  @IsOptional()
  @IsEmail()
  businessEmail?: string;

  @IsOptional()
  @IsString()
  businessPhone?: string;

  @IsOptional()
  @IsString()
  businessAddress?: string;
}
