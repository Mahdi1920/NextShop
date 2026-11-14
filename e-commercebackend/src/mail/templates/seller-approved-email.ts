import { renderEmailLayout } from './email-layout';

export function renderSellerApprovedEmail(opts: {
  fullname?: string;
  shopName?: string;
}): string {
  const body = `
<p>Hi${opts.fullname ? ` ${escapeHtml(opts.fullname)}` : ''},</p>
<p>Good news — your seller request${opts.shopName ? ` for <b>${escapeHtml(opts.shopName)}</b>` : ''} has been <b>approved</b>.</p>
<p>You can now sign in and start managing your store.</p>
`.trim();

  return renderEmailLayout({
    title: 'Seller request approved',
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
