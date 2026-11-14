import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { UserRole } from '../common/enums/role.enum';

@Injectable()
export class AdminSeedService implements OnModuleInit {
  private readonly logger = new Logger(AdminSeedService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit(): Promise<void> {
    const enabledRaw = process.env.ADMIN_SEED_ENABLED;
    const enabled = enabledRaw === undefined ? true : String(enabledRaw).toLowerCase() === 'true';
    if (!enabled) return;

    const hasAdmin = await this.userModel.exists({ role: UserRole.ADMIN }).exec();
    if (hasAdmin) return;

    const email = (process.env.ADMIN_SEED_EMAIL ?? 'admin@nextshop.com').trim();
    const username = (process.env.ADMIN_SEED_USERNAME ?? 'admin').trim();
    const fullname = (process.env.ADMIN_SEED_FULLNAME ?? 'Admin').trim();
    const phone = (process.env.ADMIN_SEED_PHONE ?? '+0000000000').trim();
    const address = (process.env.ADMIN_SEED_ADDRESS ?? 'N/A').trim();
    const avatar = (process.env.ADMIN_SEED_AVATAR ?? 'https://ui-avatars.com/api/?name=Admin&background=0D8ABC&color=fff').trim();

    let password = process.env.ADMIN_SEED_PASSWORD?.trim();
    if (!password) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error(
          'ADMIN_SEED_PASSWORD is required in production when seeding an admin user.',
        );
        return;
      }

      password = randomBytes(18).toString('base64url');
      this.logger.warn(
        `No ADMIN_SEED_PASSWORD provided; generated a one-time admin password: ${password}`,
      );
    }

    await this.usersService.createUser({
      fullname,
      username,
      email,
      password,
      role: UserRole.ADMIN,
      isActive: true,
      phone,
      address,
      avatar,
    } as any);

    this.logger.log(`Seeded initial ADMIN user: ${email}`);
  }
}
