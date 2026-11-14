import { IsEmail, IsNotEmpty, MinLength, IsOptional, IsEnum, IsString, IsBoolean, IsArray, IsUUID, ValidateNested, ValidateIf, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../common/enums/role.enum';
import { SellerProfileDto } from './seller-profile.dto';

export class CreateUserDto {
  @IsNotEmpty()
  fullname: string;

  @IsNotEmpty() 
  username: string;

  @IsEmail() 
  email: string;

  @MinLength(6) 
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role: UserRole;

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

  @ValidateIf((o) => o.role === UserRole.SELLER)
  @IsDefined()
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
