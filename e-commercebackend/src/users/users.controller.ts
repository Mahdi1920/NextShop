import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { SellerDocumentReviewService } from './seller-document-review.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AddAddressDto } from './dto/address.dto';
import { UpdateSellerStoreDto } from './dto/update-seller-store.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../common/enums/role.enum';
import { SellerStatus } from '../common/enums/seller-status.enum';
import 'multer';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly sellerDocumentReviewService: SellerDocumentReviewService,
  ) {}

  // SELF (customer/seller)
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request & { user?: any }) {
    return this.usersService.getMe(req.user.sub);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async updateMe(
    @Req() req: Request & { user?: any },
    @Body() dto: UpdateMeDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.updateMe(req.user.sub, dto, avatar);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthGuard)
  async changeMyPassword(
    @Req() req: Request & { user?: any },
    @Body() dto: ChangePasswordDto,
  ) {
    return this.usersService.changeMyPassword(
      req.user.sub,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Get('me/addresses')
  @UseGuards(JwtAuthGuard)
  async listAddresses(@Req() req: Request & { user?: any }) {
    return this.usersService.listAddresses(req.user.sub);
  }

  @Post('me/addresses')
  @UseGuards(JwtAuthGuard)
  async addAddress(
    @Req() req: Request & { user?: any },
    @Body() dto: AddAddressDto,
  ) {
    return this.usersService.addAddress(req.user.sub, dto.address);
  }

  @Delete('me/addresses/:index')
  @UseGuards(JwtAuthGuard)
  async removeAddress(
    @Req() req: Request & { user?: any },
    @Param('index') index: string,
  ) {
    return this.usersService.removeAddress(req.user.sub, Number(index));
  }

  @Put('me/store')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  async updateStore(
    @Req() req: Request & { user?: any },
    @Body() dto: UpdateSellerStoreDto,
  ) {
    return this.usersService.updateSellerStore(req.user.sub, dto);
  }

  @Post('me/seller-request/resubmit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SELLER)
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'identityDocumentFile', maxCount: 1 },
      { name: 'businessRegistrationFile', maxCount: 1 },
      { name: 'companyRegistrationCertificateFile', maxCount: 1 },
      { name: 'documents', maxCount: 10 },
    ]),
  )
  async resubmitSellerRequest(
    @Req() req: Request & { user?: any },
    @UploadedFiles()
    files: {
      identityDocumentFile?: Express.Multer.File[];
      businessRegistrationFile?: Express.Multer.File[];
      companyRegistrationCertificateFile?: Express.Multer.File[];
      documents?: Express.Multer.File[];
    },
  ) {
    return this.usersService.resubmitSellerRequest(req.user.sub, {
      identityDocumentFile: files?.identityDocumentFile?.[0],
      businessRegistrationFile: files?.businessRegistrationFile?.[0],
      companyRegistrationCertificateFile:
        files?.companyRegistrationCertificateFile?.[0],
      extraDocuments: files?.documents,
    });
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAll() {
    return this.usersService.findAll();
  }

  @Post('me/presence')
  @UseGuards(JwtAuthGuard)
  async markConnected(@Req() req: Request & { user?: any }) {
    await this.usersService.markConnected(req.user.sub);
    return { ok: true };
  }

  @Get('presence/online-count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async countConnectedUsers() {
    return { count: await this.usersService.countConnectedUsers() };
  }

  @Get('search')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async search(@Query('q') q: string) {
    return this.usersService.searchUsers(q);
  }

  @Get('by-email/:email')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findByEmail(@Param('email') email: string) {
    return this.usersService.findByEmail(email);
  }

  @Get('sellers/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listPendingSellers() {
    return this.usersService.listSellersByStatus(SellerStatus.PENDING);
  }

  @Post('sellers/:id/document-review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async reviewSellerDocuments(
    @Param('id') id: string,
    @Body('documentUrls') documentUrls: string[],
  ) {
    return this.sellerDocumentReviewService.review(id, documentUrls);
  }

  @Patch('sellers/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async approveSeller(@Param('id') id: string) {
    return this.usersService.approveSeller(id);
  }

  @Patch('sellers/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async rejectSeller(@Param('id') id: string, @Body('reason') reason: string) {
    return this.usersService.rejectSeller(id, reason);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('avatar'))
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() avatar?: Express.Multer.File,
  ) {
    return this.usersService.update(id, updateUserDto, avatar);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async delete(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    return this.usersService.delete(id, req.user.sub);
  }

  @Post(':id/strike')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async strike(
    @Req() req: Request & { user?: any },
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.usersService.strikeUser(id, reason, req.user.sub);
  }

  @Patch(':id/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async block(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    return this.usersService.setBlocked(id, true, req.user.sub);
  }

  @Patch(':id/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async unblock(@Req() req: Request & { user?: any }, @Param('id') id: string) {
    return this.usersService.setBlocked(id, false, req.user.sub);
  }

  // Change password
  /* @Patch(':id/change-password')
  async changePassword(
    @Param('id') id: string,
    @Body('oldPassword') oldPassword: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.usersService.changePassword(id, oldPassword, newPassword);
  } */

  // Forgot password (send reset link or code)
  /* @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.usersService.forgotPassword(email);
  } */
}
