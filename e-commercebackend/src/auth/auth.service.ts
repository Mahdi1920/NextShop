import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Model } from "mongoose";
import { User, UserDocument } from "../users/schemas/user.schema";
import { SellerProfileDto } from "../users/dto/seller-profile.dto";
import { UsersService } from "../users/users.service";
import { RegisterDto } from "./dto/register.dto";
import { UserRole } from "../common/enums/role.enum";
import { InjectModel } from "@nestjs/mongoose";
import { JwtService } from "@nestjs/jwt";
import { MailService } from "../mail/mail.service";
import { SellerStatus } from "../common/enums/seller-status.enum";
import { NotificationsService } from "../notifications/notifications.service";
import "multer";
import { resolve4, resolve6, resolveMx } from "node:dns/promises";

@Injectable()
export class AuthService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private async validateEmailDomain(email: string, fieldName: string) {
    const domain = email.trim().split("@").at(-1)?.toLowerCase();
    if (!domain) throw new BadRequestException(`Enter a valid ${fieldName}`);

    try {
      const mxRecords = await resolveMx(domain);
      if (mxRecords.length > 0) return;
    } catch {
      // Some valid mail domains rely on address records instead of MX records.
    }

    try {
      await Promise.any([resolve4(domain), resolve6(domain)]);
    } catch {
      throw new BadRequestException(`${fieldName} domain was not found. Check the address and try again.`);
    }
  }

  private validateRegistrationFiles(
    avatarFile?: Express.Multer.File,
    sellerUploads?: {
      identityDocumentFile?: Express.Multer.File;
      businessRegistrationFile?: Express.Multer.File;
      companyRegistrationCertificateFile?: Express.Multer.File;
      extraDocuments?: Express.Multer.File[];
    },
  ) {
    if (avatarFile && !avatarFile.mimetype.startsWith('image/')) {
      throw new BadRequestException('Avatar must be an image');
    }

    const documents = [
      sellerUploads?.identityDocumentFile,
      sellerUploads?.businessRegistrationFile,
      sellerUploads?.companyRegistrationCertificateFile,
      ...(sellerUploads?.extraDocuments ?? []),
    ].filter((file): file is Express.Multer.File => Boolean(file));

    if (documents.some((file) =>
      !file.mimetype.startsWith('image/') && file.mimetype !== 'application/pdf'
    )) {
      throw new BadRequestException('Seller documents must be images or PDF files');
    }
  }

  private validateSellerRegistration(dto: RegisterDto) {
    const profile: any = (dto as any).sellerProfile;
    if (!profile || typeof profile === 'string') {
      throw new BadRequestException(
        'Seller registration requires sellerProfile details',
      );
    }

    const missing: string[] = [];
    if (!profile.shopName?.trim()) missing.push('sellerProfile.shopName');
    if (!profile.businessEmail?.trim()) missing.push('sellerProfile.businessEmail');
    if (!profile.businessPhone?.trim()) missing.push('sellerProfile.businessPhone');
    const businessAddresses = Array.isArray(profile.businessAddresses)
      ? profile.businessAddresses
      : profile.businessAddress ? [profile.businessAddress] : [];
    if (!businessAddresses.length || businessAddresses.some((value: unknown) => typeof value !== 'string' || !value.trim()))
      missing.push('sellerProfile.businessAddresses');

    if (missing.length) {
      throw new BadRequestException(
        `Missing required seller fields: ${missing.join(', ')}`,
      );
    }
  }

  private async coerceSellerProfile(dto: RegisterDto): Promise<RegisterDto> {
    const anyDto = dto as any;
    if (typeof anyDto?.sellerProfile === 'string') {
      try {
        anyDto.sellerProfile = JSON.parse(anyDto.sellerProfile);
      } catch {
        throw new BadRequestException('sellerProfile must be valid JSON');
      }
    }

    if (anyDto?.sellerProfile && typeof anyDto.sellerProfile === 'object') {
      const profile = plainToInstance(SellerProfileDto, anyDto.sellerProfile);
      const errors = await validate(profile, {
        whitelist: true,
        forbidNonWhitelisted: true,
      });
      if (errors.length) {
        const messages: string[] = [];
        const collect = (items: typeof errors, prefix: string) => {
          for (const error of items) {
            const property = prefix ? `${prefix}.${error.property}` : error.property;
            messages.push(...Object.values(error.constraints ?? {}).map((message) => `${property}: ${message}`));
            collect(error.children ?? [], property);
          }
        };
        collect(errors, 'sellerProfile');
        throw new BadRequestException(messages);
      }
      anyDto.sellerProfile = profile;
    }

    return dto;
  }

  async register(
    dto: RegisterDto,
    avatarFile?: Express.Multer.File,
    sellerUploads?: {
      identityDocumentFile?: Express.Multer.File;
      businessRegistrationFile?: Express.Multer.File;
      companyRegistrationCertificateFile?: Express.Multer.File;
      extraDocuments?: Express.Multer.File[];
    },
  ) {
    await this.coerceSellerProfile(dto);
    this.validateRegistrationFiles(avatarFile, sellerUploads);
    await this.validateEmailDomain(dto.email, "Email");
    const role = dto.role ?? UserRole.CUSTOMER;

    if (role === UserRole.ADMIN) {
      throw new BadRequestException('Admin role cannot be assigned via public registration');
    }

    if (role === UserRole.SELLER) {
      this.validateSellerRegistration(dto);

      const profile: any = (dto as any).sellerProfile;
      if (profile.businessEmail.trim().toLowerCase() === dto.email.trim().toLowerCase()) {
        throw new BadRequestException('Business email must be different from the account email');
      }
      await this.validateEmailDomain(profile.businessEmail, "Business email");
      const missingSeller: string[] = [];

      if (!profile?.identityDocument) missingSeller.push('sellerProfile.identityDocument');
      if (!profile?.identityDocument?.type) missingSeller.push('sellerProfile.identityDocument.type');
      if (!profile?.businessRegistration) missingSeller.push('sellerProfile.businessRegistration');
      if (!profile?.businessRegistration?.registrationNumber)
        missingSeller.push('sellerProfile.businessRegistration.registrationNumber');
      if (!profile?.bankInfo) missingSeller.push('sellerProfile.bankInfo');
      if (!profile?.bankInfo?.accountHolder) missingSeller.push('sellerProfile.bankInfo.accountHolder');
      if (!profile?.bankInfo?.iban) missingSeller.push('sellerProfile.bankInfo.iban');

      if (!sellerUploads?.identityDocumentFile) missingSeller.push('identityDocumentFile');
      if (!sellerUploads?.businessRegistrationFile) missingSeller.push('businessRegistrationFile');
      if (!sellerUploads?.companyRegistrationCertificateFile)
        missingSeller.push('companyRegistrationCertificateFile');

      if (missingSeller.length) {
        throw new BadRequestException(
          `Missing required seller fields: ${missingSeller.join(', ')}`,
        );
      }
    }

    const emailExists = await this.userModel.exists({ email: dto.email }).exec();
    if (emailExists) {
      throw new BadRequestException('Email already exists');
    }

    const createPayload: any = {
      ...dto,
      addresses: Array.isArray((dto as any).addresses)
        ? (dto as any).addresses.map((value: string) => value.trim())
        : [dto.address!.trim()],
      address: Array.isArray((dto as any).addresses)
        ? (dto as any).addresses[0].trim()
        : dto.address!.trim(),
      role,
      isActive: false,
    };

    if (role === UserRole.SELLER) {
      createPayload.sellerProfile = {
        ...(dto as any).sellerProfile,
        businessAddresses: (dto as any).sellerProfile.businessAddresses?.map((value: string) => value.trim())
          ?? [(dto as any).sellerProfile.businessAddress.trim()],
        businessAddress: (dto as any).sellerProfile.businessAddresses?.[0] ?? (dto as any).sellerProfile.businessAddress,
        status: SellerStatus.PENDING,
        verified: false,
        verifiedAt: undefined,
        reviewedAt: undefined,
        rejectionReason: undefined,
      };
    }

    const user = await this.usersService.createUser(
      createPayload,
      avatarFile,
      sellerUploads,
    );

    // Notify admin live of new user registration
    this.notificationsService.emitLiveEvent({ role: UserRole.ADMIN, broadcast: true }, 'user:signup', {
      role,
      userId: (user as any)._id?.toString(),
    });
    this.notificationsService.emitLiveEvent({ role: UserRole.ADMIN, broadcast: true }, 'dashboard:refresh:admin', {
      type: 'USER_REGISTERED',
      role,
    });

    if (role === UserRole.SELLER) {
      void this.notificationsService
        .createAndSend({
          role: UserRole.ADMIN,
          type: "SELLER_SIGNUP",
          title: "New Seller Registration",
          message: `Seller "${user.fullname}" registered store "${(user as any)?.sellerProfile?.shopName || user.username}".`,
          data: {
            userId: (user as any)._id?.toString(),
            shopName: (user as any)?.sellerProfile?.shopName,
            email: user.email,
          },
        })
        .catch(() => undefined);
      this.notificationsService.emitLiveEvent({ role: UserRole.ADMIN }, "dashboard:refresh:admin", {
        type: "SELLER_SIGNUP",
      });

      await this.mailService.sendSellerRequestReceivedEmail(user.email, {
        fullname: user.fullname,
        shopName: (user as any)?.sellerProfile?.shopName,
      });

      const adminEmailFromEnv = process.env.ADMIN_NOTIFY_EMAIL;
      const adminEmail = adminEmailFromEnv?.trim()
        ? adminEmailFromEnv.trim()
        : (await this.userModel.findOne({ role: UserRole.ADMIN }).select('email').exec())
            ?.email;

      if (adminEmail) {
        const rawIban: string | undefined = (user as any)?.sellerProfile?.bankInfo?.iban;
        const ibanMasked = rawIban ? maskIban(rawIban) : undefined;

        const docUrls: string[] = [
          (user as any)?.sellerProfile?.identityDocument?.fileUrl,
          (user as any)?.sellerProfile?.businessRegistration?.documentUrl,
          (user as any)?.sellerProfile?.companyRegistrationCertificateUrl,
          ...(((user as any)?.sellerProfile?.documents as string[]) ?? []),
        ].filter(Boolean);

        await this.mailService.sendSellerRequestToAdminEmail(adminEmail, {
          fullname: user.fullname,
          email: user.email,
          phone: (user as any)?.phone,
          shopName: (user as any)?.sellerProfile?.shopName,
          businessEmail: (user as any)?.sellerProfile?.businessEmail,
          businessPhone: (user as any)?.sellerProfile?.businessPhone,
          businessAddress: (user as any)?.sellerProfile?.businessAddress,
          documents: docUrls,

          identityDocumentType: (user as any)?.sellerProfile?.identityDocument?.type,
          businessRegistrationNumber:
            (user as any)?.sellerProfile?.businessRegistration?.registrationNumber,
          bankAccountHolder: (user as any)?.sellerProfile?.bankInfo?.accountHolder,
          bankIbanMasked: ibanMasked,
         // bankPaymentMethod: (user as any)?.sellerProfile?.bankInfo?.paymentMethod,
          bankName: (user as any)?.sellerProfile?.bankInfo?.bankName,
          bankSwift: (user as any)?.sellerProfile?.bankInfo?.swift,
        });
      }
    } else {
      // generate activation token (JWT or random string)
      const userId = (user as any)._id?.toString?.() ?? (user as any).id;
      const activationToken = this.jwtService.sign(
        { userId, type: 'activation' },
        { expiresIn: '1d' },
      );

      const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(
        /\/$/,
        '',
      );
      const activationLink = `${backendUrl}/api/v1/auth/activate/${activationToken}`;

      // send activation email
      await this.mailService.sendUserActivationEmail(
        user.email,
        activationLink,
        user.fullname,
      );
    }

    return {
      message:
        'Registration successful. Please check your email to activate your account.',
    };
}

  
  async activateAccount(token: string): Promise<{ message: string }> {
    let payload: { userId?: string; type?: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired activation token');
    }

    if (payload.type !== 'activation' || !payload.userId) {
      throw new UnauthorizedException('Invalid activation token');
    }

    const userId = payload.userId;

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { isActive: true }, { new: true })
      .exec();

    if (!updatedUser) throw new NotFoundException('User not found');

    return { message: 'Account successfully activated. You can now log in.' };
}

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException('User not found');

    if (!user.isActive) {
      if (user.role === UserRole.SELLER) {
        const status = (user as any)?.sellerProfile?.status;
        if (status === SellerStatus.REJECTED) {
          const reason = (user as any)?.sellerProfile?.rejectionReason;
          throw new UnauthorizedException(
            reason
              ? `Seller request was rejected: ${reason}`
              : 'Seller request was rejected',
          );
        }
        throw new UnauthorizedException('Seller account is pending admin approval');
      }
      throw new UnauthorizedException('Account is not activated');
    }
    if ((user as any).isBlocked) {
      throw new UnauthorizedException('Account is blocked');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = {
      sub: (user as any)._id?.toString?.() ?? (user as any).id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '30m' });

    const { password: _pwd, ...safeUser } = user.toObject();
    return { accessToken, user: safeUser };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      // Do not reveal whether the account exists
      return { message: 'If that email exists, a reset link was sent.' };
    }

    const userId = (user as any)._id?.toString?.() ?? (user as any).id;
    const resetToken = this.jwtService.sign(
      { userId, type: 'password_reset' },
      { expiresIn: '15m' },
    );

    const backendUrl = (process.env.BACKEND_URL ?? 'http://localhost:3001').replace(
      /\/$/,
      '',
    );
    const resetLink = `${backendUrl}/api/v1/auth/reset-password/${resetToken}`;

    await this.mailService.sendPasswordResetEmail(user.email, resetLink);
    return { message: 'If that email exists, a reset link was sent.' };
  }

  async refreshToken(user: { sub: string; email: string; role: any }): Promise<{ accessToken: string }> {
    const payload = { sub: user.sub, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '30m' });
    return { accessToken };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    try {
      const payload = this.jwtService.verify(token) as {
        userId: string;
        type?: string;
      };

      if (payload.type !== 'password_reset') {
        throw new UnauthorizedException('Invalid reset token');
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      const updated = await this.userModel
        .findByIdAndUpdate(payload.userId, { password: hashed }, { new: true })
        .exec();
      if (!updated) throw new NotFoundException('User not found');

      return { message: 'Password successfully reset. You can now log in.' };
    } catch {
      throw new UnauthorizedException('Invalid or expired reset token');
    }
  }


  /* async login(email: string, password: string): Promise<{ accessToken: string; user: Partial<User> }> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException("User not found");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException("Invalid credentials");

    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    const { password: _, ...result } = user.toObject();
    return { accessToken, user: result };
  }

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) throw new NotFoundException("User not found");

    // TODO: generate reset token & send email
    return { message: "Password reset instructions sent to email (stub)" };
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<Partial<User>> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException("User not found");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new UnauthorizedException("Old password is incorrect");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    const { password, ...result } = user.toObject();
    return result;
  } */
}

function maskIban(iban: string): string {
  const compact = iban.replaceAll(' ', '').trim();
  if (compact.length <= 8) return compact;
  return `${compact.slice(0, 4)}…${compact.slice(-4)}`;
}
