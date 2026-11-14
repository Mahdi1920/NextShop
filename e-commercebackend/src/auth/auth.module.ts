import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuthController } from './auth.controller';
import { MailModule } from '../mail/mail.module';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AdminSeedService } from './admin-seed.service';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';

@Module({
  imports: [
    UsersModule,
    MailModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'defaultSecret',
      signOptions: { expiresIn: '30m' },
    }),
  ], 
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, AdminSeedService, LoginRateLimitGuard],
  exports: [AuthService],
 
})
export class AuthModule {}
