import { JwtAuthGuard } from './guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { LoginRateLimitGuard } from './guards/login-rate-limit.guard';
import 'multer';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // REGISTER with optional profile image
  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'avatar', maxCount: 1 },
      { name: 'identityDocumentFile', maxCount: 1 },
      { name: 'businessRegistrationFile', maxCount: 1 },
      { name: 'companyRegistrationCertificateFile', maxCount: 1 },
      { name: 'documents', maxCount: 10 },
    ]),
  )
  async register(
    @Body() registerDto: RegisterDto,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      identityDocumentFile?: Express.Multer.File[];
      businessRegistrationFile?: Express.Multer.File[];
      companyRegistrationCertificateFile?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    return this.authService.register(
      registerDto,
      files?.avatar?.[0],
      {
        identityDocumentFile: files?.identityDocumentFile?.[0],
        businessRegistrationFile: files?.businessRegistrationFile?.[0],
        companyRegistrationCertificateFile:
          files?.companyRegistrationCertificateFile?.[0],
        extraDocuments: files?.documents,
      },
    );
  }

  // ACTIVATE ACCOUNT
  @Get('activate/:token')
  async activate(@Param('token') token: string) {
    return this.authService.activateAccount(token);
  }

  // LOGIN returns JWT accessToken
  @Post('login')
  @UseGuards(LoginRateLimitGuard)
  async login(@Body() loginDto: LoginDto) {
    const { email, password } = loginDto;
    return this.authService.login(email, password);
  }

  // REFRESH TOKEN (for active users)
  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@Req() req: any) {
    return this.authService.refreshToken(req.user);
  }

  // FORGOT PASSWORD (send reset link)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  // RESET PASSWORD
  @Post('reset-password/:token')
  async resetPassword(
    @Param('token') token: string,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(token, dto.newPassword);
  }

}
