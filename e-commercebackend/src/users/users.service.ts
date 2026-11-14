import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateSellerStoreDto } from './dto/update-seller-store.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { SellerStatus } from '../common/enums/seller-status.enum';
import { UserRole } from '../common/enums/role.enum';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import 'multer';

const SELLER_SUSPEND_AFTER_BANS = 3;

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>,
              private readonly cloudinaryService: CloudinaryService,
              private readonly mailService: MailService,
              private readonly notificationsService: NotificationsService,
              private readonly gateway: NotificationsGateway,) {}

  private slugify(input: string): string {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  async markConnected(userId: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $set: { lastSeenAt: new Date() } }).exec();
  }

  async countConnectedUsers(): Promise<number> {
    const onlineSince = new Date(Date.now() - 90_000);
    return this.userModel.countDocuments({
      role: { $in: [UserRole.CUSTOMER, UserRole.SELLER] },
      lastSeenAt: { $gte: onlineSince },
    }).exec();
  }

  private async ensureUniqueShopSlug(baseSlug: string): Promise<string> {
    let candidate = baseSlug;
    let suffix = 1;

    // Keep it bounded; we just need a unique slug.
    while (suffix < 1000) {
      const exists = await this.userModel
        .exists({ 'sellerProfile.shopSlug': candidate })
        .exec();
      if (!exists) return candidate;

      suffix += 1;
      candidate = `${baseSlug}-${suffix}`;
    }

    // Extremely unlikely, but guarantees uniqueness.
    return `${baseSlug}-${Date.now()}`;
  }

  private escapeRegExp(input: string): string {
    return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async createUser(
    dto: CreateUserDto,
    avatarFile?: Express.Multer.File,
    sellerUploads?: {
      identityDocumentFile?: Express.Multer.File;
      businessRegistrationFile?: Express.Multer.File;
      companyRegistrationCertificateFile?: Express.Multer.File;
      extraDocuments?: Express.Multer.File[];
    },
  ): Promise<User> {
    try {
      let avatarUrl: string | undefined;
      
      if (avatarFile) {
        avatarUrl = await this.cloudinaryService.uploadFile(avatarFile, 'nextshop');
      } else if (dto.avatar) { 
        avatarUrl = dto.avatar;
      }

      const hashedPassword = await bcrypt.hash(dto.password, 10);

      let sellerProfile = dto.sellerProfile;
      if (dto.role === UserRole.SELLER && sellerProfile) {
        const providedSlug = sellerProfile.shopSlug?.trim();
        const baseSlug = this.slugify(providedSlug || sellerProfile.shopName || 'shop');
        const uniqueSlug = await this.ensureUniqueShopSlug(baseSlug);
        sellerProfile = { ...sellerProfile, shopSlug: uniqueSlug };

        const extraFiles = sellerUploads?.extraDocuments ?? [];
        const extraDocUrls = extraFiles.length
          ? await Promise.all(
              extraFiles.map((f) =>
                this.cloudinaryService.uploadFile(f, 'nextshop/seller-documents'),
              ),
            )
          : [];

        const identityUrl = sellerUploads?.identityDocumentFile
          ? await this.cloudinaryService.uploadFile(
              sellerUploads.identityDocumentFile,
              'nextshop/seller-documents',
            )
          : undefined;

        const businessRegUrl = sellerUploads?.businessRegistrationFile
          ? await this.cloudinaryService.uploadFile(
              sellerUploads.businessRegistrationFile,
              'nextshop/seller-documents',
            )
          : undefined;

        const companyCertUrl = sellerUploads?.companyRegistrationCertificateFile
          ? await this.cloudinaryService.uploadFile(
              sellerUploads.companyRegistrationCertificateFile,
              'nextshop/seller-documents',
            )
          : undefined;

        sellerProfile = {
          ...(sellerProfile as any),
          identityDocument: {
            ...((sellerProfile as any).identityDocument ?? {}),
            fileUrl: identityUrl ?? (sellerProfile as any).identityDocument?.fileUrl,
          },
          businessRegistration: {
            ...((sellerProfile as any).businessRegistration ?? {}),
            documentUrl:
              businessRegUrl ?? (sellerProfile as any).businessRegistration?.documentUrl,
          },
          companyRegistrationCertificateUrl:
            companyCertUrl ?? (sellerProfile as any).companyRegistrationCertificateUrl,
          documents: [
            ...(((sellerProfile as any).documents as string[]) ?? []),
            ...extraDocUrls,
          ],
        };
      }

      const newUser = new this.userModel({
        ...dto,
        password: hashedPassword,
        avatar: avatarUrl,
        sellerProfile,
        wishlist: dto.wishlist ?? [], // ✅ ensures it's always an array
        orders: dto.orders ?? [],     // ✅ ensures it's always an array
      });

      return await newUser.save();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error creating user:', error);

      const err: any = error;

      // Mongo duplicate key (unique index), e.g. email already used
      if (err?.code === 11000) {
        const dupField = Object.keys(err?.keyPattern ?? err?.keyValue ?? {})[0];
        if (dupField === 'email') {
          throw new BadRequestException('Email already exists');
        }
        throw new BadRequestException(`Duplicate value for field: ${dupField ?? 'unknown'}`);
      }

      // Mongoose schema validation errors (missing required fields, etc.)
      if (err?.name === 'ValidationError') {
        const messages = Object.values(err?.errors ?? {})
          .map((e: any) => e?.message)
          .filter(Boolean);
        if (messages.length) {
          throw new BadRequestException(messages.join('; '));
        }
        throw new BadRequestException('Invalid user data');
      }

      throw new BadRequestException('Failed to create user');
    }
  }

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').exec();
  }

  async listSellersByStatus(status: SellerStatus): Promise<User[]> {
    return this.userModel
      .find({ role: UserRole.SELLER, 'sellerProfile.status': status })
      .select('-password')
      .sort({ createdAt: -1 })
      .exec();
  }

  private async resolveAdminNotifyEmail(): Promise<string | undefined> {
    const fromEnv = process.env.ADMIN_NOTIFY_EMAIL?.trim();
    if (fromEnv) return fromEnv;

    const admin = await this.userModel
      .findOne({ role: UserRole.ADMIN })
      .select('email')
      .exec();
    return admin?.email;
  }

  async resubmitSellerRequest(
    userId: string,
    uploads?: {
      identityDocumentFile?: Express.Multer.File;
      businessRegistrationFile?: Express.Multer.File;
      companyRegistrationCertificateFile?: Express.Multer.File;
      extraDocuments?: Express.Multer.File[];
    },
  ): Promise<{ message: string; user: User }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.SELLER) {
      throw new BadRequestException('Only sellers can resubmit a seller request');
    }

    const currentStatus = (user as any)?.sellerProfile?.status;
    if (currentStatus !== SellerStatus.REJECTED) {
      throw new BadRequestException(
        'Only rejected seller requests can be resubmitted',
      );
    }

    const existingDocs: string[] = (user as any)?.sellerProfile?.documents ?? [];
    const extraFiles = uploads?.extraDocuments ?? [];
    const newExtraDocUrls = extraFiles.length
      ? await Promise.all(
          extraFiles.map((f) =>
            this.cloudinaryService.uploadFile(f, 'nextshop/seller-documents'),
          ),
        )
      : [];

    const identityUrl = uploads?.identityDocumentFile
      ? await this.cloudinaryService.uploadFile(
          uploads.identityDocumentFile,
          'nextshop/seller-documents',
        )
      : undefined;

    const businessRegUrl = uploads?.businessRegistrationFile
      ? await this.cloudinaryService.uploadFile(
          uploads.businessRegistrationFile,
          'nextshop/seller-documents',
        )
      : undefined;

    const companyCertUrl = uploads?.companyRegistrationCertificateFile
      ? await this.cloudinaryService.uploadFile(
          uploads.companyRegistrationCertificateFile,
          'nextshop/seller-documents',
        )
      : undefined;

    (user as any).isActive = false;
    (user as any).sellerProfile = {
      ...((user as any).sellerProfile ?? {}),
      status: SellerStatus.PENDING,
      reviewedAt: undefined,
      rejectionReason: undefined,
      identityDocument: {
        ...((user as any).sellerProfile?.identityDocument ?? {}),
        fileUrl: identityUrl ?? (user as any).sellerProfile?.identityDocument?.fileUrl,
      },
      businessRegistration: {
        ...((user as any).sellerProfile?.businessRegistration ?? {}),
        documentUrl:
          businessRegUrl ?? (user as any).sellerProfile?.businessRegistration?.documentUrl,
      },
      companyRegistrationCertificateUrl:
        companyCertUrl ?? (user as any).sellerProfile?.companyRegistrationCertificateUrl,
      documents: [...existingDocs, ...newExtraDocUrls],
    };

    await user.save();

    await this.mailService.sendSellerRequestReceivedEmail(user.email, {
      fullname: (user as any).fullname,
      shopName: (user as any)?.sellerProfile?.shopName,
    });

    const adminEmail = await this.resolveAdminNotifyEmail();
    if (adminEmail) {
      const rawIban: string | undefined = (user as any)?.sellerProfile?.bankInfo?.iban;
      const ibanMasked = rawIban ? maskIban(rawIban) : undefined;

      const docUrls: string[] = [
        (user as any)?.sellerProfile?.identityDocument?.fileUrl,
        (user as any)?.sellerProfile?.businessRegistration?.documentUrl,
        (user as any)?.sellerProfile?.companyRegistrationCertificateUrl,
        ...(((user as any)?.sellerProfile?.documents as string[]) ?? []),
      ].filter(Boolean);

      await this.mailService.sendSellerResubmittedToAdminEmail(adminEmail, {
        fullname: (user as any).fullname,
        email: user.email,
        shopName: (user as any)?.sellerProfile?.shopName,
        documents: docUrls,

        identityDocumentType: (user as any)?.sellerProfile?.identityDocument?.type,
        businessRegistrationNumber:
          (user as any)?.sellerProfile?.businessRegistration?.registrationNumber,
        bankAccountHolder: (user as any)?.sellerProfile?.bankInfo?.accountHolder,
        bankIbanMasked: ibanMasked,
        //bankPaymentMethod: (user as any)?.sellerProfile?.bankInfo?.paymentMethod,
        bankName: (user as any)?.sellerProfile?.bankInfo?.bankName,
        bankSwift: (user as any)?.sellerProfile?.bankInfo?.swift,
      });
    }

    const { password: _pwd, ...safeUser } = (user as any).toObject();
    return {
      message: 'Seller request re-submitted. Waiting for admin review.',
      user: safeUser as User,
    };
  }

  async approveSeller(id: string): Promise<User> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.SELLER) {
      throw new BadRequestException('User is not a seller');
    }

    (user as any).isActive = true;
    (user as any).sellerProfile = {
      ...((user as any).sellerProfile ?? {}),
      status: SellerStatus.APPROVED,
      verified: true,
      verifiedAt: new Date(),
      reviewedAt: new Date(),
      rejectionReason: undefined,
    };
    await user.save();

    await this.mailService.sendSellerApprovedEmail(user.email, {
      fullname: (user as any).fullname,
      shopName: (user as any)?.sellerProfile?.shopName,
    });

    this.notificationsService.emitLiveEvent(
      { userId: user._id.toString() },
      'seller:status_updated',
      { status: SellerStatus.APPROVED },
    );
    this.notificationsService.emitLiveEvent(
      { role: UserRole.ADMIN, broadcast: true },
      'dashboard:refresh:admin',
      { action: 'seller_approved', userId: user._id.toString() },
    );

    const { password: _pwd, ...safeUser } = (user as any).toObject();
    return safeUser as User;
  }

  async rejectSeller(id: string, reason: string): Promise<User> {
    const cleanedReason = (reason ?? '').trim();
    if (!cleanedReason) throw new BadRequestException('Rejection reason is required');

    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.SELLER) {
      throw new BadRequestException('User is not a seller');
    }

    (user as any).isActive = false;
    (user as any).sellerProfile = {
      ...((user as any).sellerProfile ?? {}),
      status: SellerStatus.REJECTED,
      reviewedAt: new Date(),
      rejectionReason: cleanedReason,
    };
    await user.save();

    await this.mailService.sendSellerRejectedEmail(user.email, {
      fullname: (user as any).fullname,
      shopName: (user as any)?.sellerProfile?.shopName,
      reason: cleanedReason,
    });

    this.notificationsService.emitLiveEvent(
      { userId: user._id.toString() },
      'seller:status_updated',
      { status: SellerStatus.REJECTED, reason: cleanedReason },
    );
    this.notificationsService.emitLiveEvent(
      { role: UserRole.ADMIN, broadcast: true },
      'dashboard:refresh:admin',
      { action: 'seller_rejected', userId: user._id.toString() },
    );

    const { password: _pwd, ...safeUser } = (user as any).toObject();
    return safeUser as User;
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getMe(userId: string): Promise<User> {
    return this.findById(userId);
  }

  async updateMe(
    userId: string,
    dto: UpdateMeDto,
    file?: Express.Multer.File,
  ): Promise<User> {
    const updateDoc: Record<string, unknown> = {};

    if (dto.fullname !== undefined) updateDoc.fullname = dto.fullname;
    if (dto.username !== undefined) updateDoc.username = dto.username;
    if (dto.phone !== undefined) updateDoc.phone = dto.phone;
    if (dto.address !== undefined) updateDoc.address = dto.address;

    if (file) {
      updateDoc.avatar = await this.cloudinaryService.uploadFile(file, 'nextshop');
    } else if (dto.avatar) {
      updateDoc.avatar = dto.avatar;
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateDoc }, { new: true })
      .select('-password')
      .exec();

    if (!updatedUser) throw new NotFoundException('User not found');
    return updatedUser;
  }

  async changeMyPassword(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw new BadRequestException('Old password is incorrect');

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return { message: 'Password updated successfully' };
  }

  async listAddresses(userId: string): Promise<string[]> {
    const user = await this.userModel.findById(userId).select('addresses').exec();
    if (!user) throw new NotFoundException('User not found');
    return (user as any).addresses ?? [];
  }

  async addAddress(userId: string, address: string): Promise<string[]> {
    const cleaned = address.trim();
    if (!cleaned) throw new BadRequestException('Address is required');

    const updated = await this.userModel
      .findByIdAndUpdate(
        userId,
        { $push: { addresses: cleaned } },
        { new: true },
      )
      .select('addresses')
      .exec();
    if (!updated) throw new NotFoundException('User not found');
    return (updated as any).addresses ?? [];
  }

  async removeAddress(userId: string, index: number): Promise<string[]> {
    const user = await this.userModel.findById(userId).select('addresses').exec();
    if (!user) throw new NotFoundException('User not found');

    const addresses: string[] = (user as any).addresses ?? [];
    if (index < 0 || index >= addresses.length) {
      throw new BadRequestException('Invalid address index');
    }

    addresses.splice(index, 1);
    (user as any).addresses = addresses;
    await user.save();
    return (user as any).addresses ?? [];
  }

  async updateSellerStore(
    userId: string,
    dto: UpdateSellerStoreDto,
  ): Promise<User> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.SELLER) {
      throw new BadRequestException('Only sellers can update store information');
    }

    const updateDoc: Record<string, unknown> = {};
    const entries = Object.entries(dto);
    for (const [key, value] of entries) {
      if (value !== undefined) {
        updateDoc[`sellerProfile.${key}`] = value;
      }
    }

    const currentShopName = (user as any).sellerProfile?.shopName?.trim();
    const nextShopName = dto.shopName?.trim();

    // Keep the slug stable unless the seller changes the shop name.
    if (nextShopName && nextShopName !== currentShopName) {
      const baseSlug = this.slugify(nextShopName);
      const uniqueSlug = await this.ensureUniqueShopSlug(baseSlug);
      updateDoc['sellerProfile.shopSlug'] = uniqueSlug;
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { $set: updateDoc }, { new: true })
      .select('-password')
      .exec();
    if (!updated) throw new NotFoundException('User not found');
    return updated;
  }

  async findByEmail(email: string): Promise<User> {
    const user = await this.userModel.findOne({ email }).select('-password').exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async searchUsers(query: string): Promise<User[]> {
    const q = query?.trim();
    if (!q) return [];

    const regex = new RegExp(this.escapeRegExp(q), 'i');
    return this.userModel
      .find({
        $or: [{ email: regex }, { username: regex }, { fullname: regex }],
      })
      .select('-password')
      .limit(50)
      .exec();
  }

  async strikeUser(
    id: string,
    reason?: string,
    actorId?: string,
  ): Promise<User> {
    if (actorId && id === actorId) {
      throw new BadRequestException('You cannot strike or ban your own account');
    }

    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    if (targetRoleIsAdmin(user.role)) {
      throw new BadRequestException('Admin accounts cannot be banned or warned');
    }

    const newNbBanned = (user.nbBanned || 0) + 1;
    user.nbBanned = newNbBanned;

    if (newNbBanned < 3) {
      void this.notificationsService
        .createAndSend({
          recipientId: user._id.toString(),
          type: 'USER_WARNING',
          title: `Account Warning (${newNbBanned}/3)`,
          message: `You have received a strike warning (${newNbBanned} of 3)${reason ? ': ' + reason : ''}. If you receive 3 strikes, your account will be permanently blocked!`,
          data: { nbBanned: newNbBanned, reason },
        })
        .catch(() => undefined);

      this.notificationsService.emitLiveEvent(
        { userId: user._id.toString() },
        'user:warning',
        { nbBanned: newNbBanned, reason }
      );
    } else {
      user.isBlocked = true;
      user.isActive = false;
      if (user.role === UserRole.SELLER && user.sellerProfile) {
        user.sellerProfile.status = SellerStatus.SUSPENDED;
      }

      void this.notificationsService
        .createAndSend({
          recipientId: user._id.toString(),
          type: 'USER_BLOCKED',
          title: 'Account Blocked',
          message: `Your account has been blocked after receiving 3 strikes/bans${reason ? ': ' + reason : ''}.`,
          data: { nbBanned: newNbBanned, reason },
        })
        .catch(() => undefined);

      this.notificationsService.emitLiveEvent(
        { userId: user._id.toString() },
        'user:blocked',
        { nbBanned: newNbBanned, reason }
      );
    }

    return await user.save();
  }

  async setBlocked(
    id: string,
    blocked: boolean,
    actorId?: string,
  ): Promise<User> {
    if (actorId && id === actorId) {
      throw new BadRequestException('You cannot block your own account');
    }

    const target = await this.userModel.findById(id).select('role').exec();
    if (!target) throw new NotFoundException('User not found');
    if (target.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin accounts cannot be blocked');
    }

    const updated = await this.userModel
      .findByIdAndUpdate(id, { isBlocked: blocked }, { new: true })
      .select('-password')
      .exec();
    if (!updated) throw new NotFoundException('User not found');

    if (blocked) {
      void this.notificationsService
        .createAndSend({
          recipientId: id,
          type: 'USER_BLOCKED',
          title: 'Account Blocked',
          message: 'Your account has been blocked by an administrator.',
        })
        .catch(() => undefined);
      this.notificationsService.emitLiveEvent({ userId: id }, 'user:blocked', { isBlocked: true });
    } else {
      void this.notificationsService
        .createAndSend({
          recipientId: id,
          type: 'USER_UNBLOCKED',
          title: 'Account Unblocked',
          message: 'Your account has been unblocked by an administrator.',
        })
        .catch(() => undefined);
      this.notificationsService.emitLiveEvent({ userId: id }, 'user:unblocked', { isBlocked: false });
    }

    return updated;
  }

  async update(id: string, dto: UpdateUserDto, file?: Express.Multer.File): Promise<User> {
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 10);
    }
    if (file) {
      dto.avatar = await this.cloudinaryService.uploadFile(file, 'nextshop');
    }

    // Clean dto to prevent overwriting fields with undefined
    Object.keys(dto).forEach((key) => dto[key] === undefined && delete dto[key]);

    const updateDoc: Record<string, unknown> = { ...dto };

    if (dto.sellerProfile) {
      delete updateDoc['sellerProfile'];

      Object.entries(dto.sellerProfile).forEach(([key, value]) => {
        if (value !== undefined) {
          updateDoc[`sellerProfile.${key}`] = value;
        }
      });

      const nbBanned = dto.sellerProfile.nbBanned;
      if (typeof nbBanned === 'number' && nbBanned >= SELLER_SUSPEND_AFTER_BANS) {
        updateDoc['sellerProfile.status'] = SellerStatus.SUSPENDED;
      }
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, { $set: updateDoc }, { new: true })
      .select('-password')
      .exec();

    if (!updatedUser) throw new NotFoundException('User not found');
    return updatedUser;
  }

  async delete(id: string, actorId?: string): Promise<void> {
    if (actorId && id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    const target = await this.userModel.findById(id).select('role').exec();
    if (!target) throw new NotFoundException('User not found');
    if (target.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin accounts cannot be deleted');
    }

    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('User not found');
  }
}

function maskIban(iban: string): string {
  const compact = iban.replaceAll(' ', '').trim();
  if (compact.length <= 8) return compact;
  return `${compact.slice(0, 4)}…${compact.slice(-4)}`;
}

function targetRoleIsAdmin(role: any): boolean {
  return role === UserRole.ADMIN;
}
