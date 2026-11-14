import {
  IsEmail,
  IsOptional,
  MinLength,
  IsEnum,
  IsString,
  IsBoolean,
  IsArray,
  IsUUID,
  IsNotEmpty,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../common/enums/role.enum';
import { SellerProfileDto } from './seller-profile.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  fullname?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => SellerProfileDto)
  sellerProfile?: SellerProfileDto;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  wishlist?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  orders?: string[];
}
