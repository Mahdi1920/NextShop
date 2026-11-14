import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { renderActivationEmail } from './templates/activation-email';
import { renderPasswordResetEmail } from './templates/password-reset-email';
import { renderSellerRequestReceivedEmail } from './templates/seller-request-received-email';
import { renderSellerRequestAdminEmail } from './templates/seller-request-admin-email';
import { renderSellerApprovedEmail } from './templates/seller-approved-email';
import { renderSellerRejectedEmail } from './templates/seller-rejected-email';
import { renderSellerResubmittedAdminEmail } from './templates/seller-resubmitted-admin-email';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendUserActivationEmail(email: string, activationLink: string, fullname?: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Activate your NextShop account',
      html: renderActivationEmail({ activationLink, fullname }),
    });
  }

  async sendPasswordResetEmail(email: string, resetLink: string, fullname?: string) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Reset your password',
      html: renderPasswordResetEmail({ resetLink, fullname }),
    });
  }

  async sendSellerRequestReceivedEmail(email: string, opts: { fullname?: string; shopName?: string }) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Seller request received',
      html: renderSellerRequestReceivedEmail(opts),
    });
  }

  async sendSellerRequestToAdminEmail(
    adminEmail: string,
    opts: {
      fullname: string;
      email: string;
      phone?: string;
      shopName?: string;
      businessEmail?: string;
      businessPhone?: string;
      businessAddress?: string;
      documents?: string[];

      identityDocumentType?: string;
      businessRegistrationNumber?: string;
      bankAccountHolder?: string;
      bankIbanMasked?: string;
      bankPaymentMethod?: string;
      bankName?: string;
      bankSwift?: string;
    },
  ) {
    await this.mailerService.sendMail({
      to: adminEmail,
      subject: 'New seller request',
      html: renderSellerRequestAdminEmail(opts),
    });
  }

  async sendSellerApprovedEmail(email: string, opts: { fullname?: string; shopName?: string }) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Your seller request was approved',
      html: renderSellerApprovedEmail(opts),
    });
  }

  async sendSellerRejectedEmail(email: string, opts: { fullname?: string; shopName?: string; reason: string }) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Your seller request was rejected',
      html: renderSellerRejectedEmail(opts),
    });
  }

  async sendSellerResubmittedToAdminEmail(
    adminEmail: string,
    opts: {
      fullname: string;
      email: string;
      shopName?: string;
      documents?: string[];

      identityDocumentType?: string;
      businessRegistrationNumber?: string;
      bankAccountHolder?: string;
      bankIbanMasked?: string;
      bankPaymentMethod?: string;
      bankName?: string;
      bankSwift?: string;
    },
  ) {
    await this.mailerService.sendMail({
      to: adminEmail,
      subject: 'Seller request re-submitted',
      html: renderSellerResubmittedAdminEmail(opts),
    });
  }
}
