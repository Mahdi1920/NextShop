import { renderEmailLayout } from './email-layout';

export function renderActivationEmail(opts: {
  activationLink: string;
  fullname?: string;
}): string {
  const body = `
<p>Hi${opts.fullname ? ` ${escapeHtml(opts.fullname)}` : ''},</p>
<p>Welcome to <b>NextShop</b>! Please activate your account to start shopping.</p>
<p style="margin:18px 0;">
  <a href="${opts.activationLink}"
     style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 16px;border-radius:10px;">
     Activate account
  </a>
</p>
<p style="color:#475569;font-size:13px;">If the button doesn’t work, copy and paste this link:</p>
<p style="word-break:break-all;"><a href="${opts.activationLink}">${opts.activationLink}</a></p>
`.trim();

  return renderEmailLayout({
    title: 'Activate your account',
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
