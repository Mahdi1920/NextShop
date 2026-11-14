import { renderEmailLayout } from './email-layout';

export function renderSellerRequestReceivedEmail(opts: {
  fullname?: string;
  shopName?: string;
}): string {
  const body = `
<p>Hi${opts.fullname ? ` ${escapeHtml(opts.fullname)}` : ''},</p>
<p>We received your request to become a seller on <b>NextShop</b>${opts.shopName ? ` for <b>${escapeHtml(opts.shopName)}</b>` : ''}.</p>
<p>Your request is now <b>pending</b> review by our admin team.</p>
<p style="color:#475569;font-size:13px;">You can’t sign in as a seller until the request is approved.</p>
`.trim();

  return renderEmailLayout({
    title: 'Seller request received',
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
