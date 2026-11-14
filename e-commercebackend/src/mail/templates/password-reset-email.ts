import { renderEmailLayout } from './email-layout';

export function renderPasswordResetEmail(opts: {
  resetLink: string;
  fullname?: string;
}): string {
  const body = `
<p>Hi${opts.fullname ? ` ${escapeHtml(opts.fullname)}` : ''},</p>
<p>We received a request to reset your password.</p>
<p style="margin:18px 0;">
  <a href="${opts.resetLink}"
     style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;">
     Reset password
  </a>
</p>
<p style="color:#475569;font-size:13px;">If you didn’t request this, you can ignore this email.</p>
<p style="color:#475569;font-size:13px;">If the button doesn’t work, copy and paste this link:</p>
<p style="word-break:break-all;"><a href="${opts.resetLink}">${opts.resetLink}</a></p>
`.trim();

  return renderEmailLayout({
    title: 'Reset your password',
    bodyHtml: body,
  });
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
