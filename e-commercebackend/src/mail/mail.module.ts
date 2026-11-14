import { MailerModule } from '@nestjs-modules/mailer';
import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

// Debug: Log environment variables
/* console.log('🔍 SMTP Config Debug:', {
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT,
  SMTP_SECURE: process.env.SMTP_SECURE,
  MAIL_USERNAME: process.env.MAIL_USERNAME,
  MAIL_PASSWORD: process.env.MAIL_PASSWORD ? '***SET***' : 'NOT SET',
}); */

@Module({
  imports: [
    MailerModule.forRoot({
      transport: (() => {
        const host = process.env.SMTP_HOST;
        const username = process.env.MAIL_USERNAME;
        const password = process.env.MAIL_PASSWORD;
        const secure = String(process.env.SMTP_SECURE).toLowerCase() === 'true';

        const portFromEnv = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined;
        const port = Number.isFinite(portFromEnv as number)
          ? (portFromEnv as number)
          : secure
            ? 465
            : 587;

        // If SMTP isn't configured, avoid throwing 500s on register/forgot-password.
        // This will emit emails as JSON instead of sending them.
        if (!host || !username || !password) {
          // eslint-disable-next-line no-console
          console.warn(
            '[MailModule] SMTP env vars missing; using jsonTransport (emails will not be sent).',
          );
          return { jsonTransport: true } as any;
        }

        return {
          host,
          port,
          secure,
          auth: {
            user: username,
            pass: password,
          },
        };
      })(),
      defaults: {
        from: process.env.MAIL_USERNAME ? `<${process.env.MAIL_USERNAME}>` : undefined,
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
