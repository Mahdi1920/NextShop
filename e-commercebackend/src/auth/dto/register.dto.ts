import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsArray,
  ArrayMaxSize,
  ArrayMinSize,
  IsEnum,
  IsUrl,
  Length,
  Matches,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../common/enums/role.enum';
import { SellerProfileDto } from '../../users/dto/seller-profile.dto';

export class RegisterDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @Length(2, 100)
  @Matches(/^[\p{L}]+(?: [\p{L}]+)*$/u, {
    message: 'fullname can contain only alphabetic characters and spaces',
  })
  fullname: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @Length(3, 30)
  @Matches(/^[A-Za-z0-9]+$/, {
    message: 'username can contain only letters and numbers',
  })
  username: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  @Length(1, 254)
  @Matches(/^[\x00-\x7F]+$/, { message: 'email must use English characters' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @Length(6, 72)
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[\x21-\x7E]{6,72}$/, {
    message: 'password must use English characters and contain at least 6 characters, one uppercase letter, one number, and one special character',
  })
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @IsObject()
  @ValidateIf((_o, value) => value !== undefined && value !== null)
  // Multipart form fields arrive as strings. Parse the JSON here, then let
  // AuthService validate the nested SellerProfileDto after normalization.
  // Applying @Type to the raw multipart string can create an empty DTO and
  // discard the parsed profile fields.
  sellerProfile?: SellerProfileDto | string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  address?: string;

  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { return value; }
    }
    return Array.isArray(value) ? value.map((item) => typeof item === 'string' ? item.trim() : item) : value;
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Matches(/\S/, { each: true, message: 'each address must not be empty' })
  @Length(1, 1000, { each: true })
  addresses?: string[];

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{8,15}$/, {
    message: 'phone must contain only digits (8 to 15 digits)',
  })
  phone?: string;

  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @ValidateIf((_o, value) => value !== undefined && value !== null && value !== '')
  @IsString()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  avatar?: string;
}
