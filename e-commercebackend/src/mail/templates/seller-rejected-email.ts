import { renderEmailLayout } from './email-layout';

export function renderSellerRejectedEmail(opts: {
  fullname?: string;
  shopName?: string;
  reason: string;
}): string {
  const body = `
<p>Hi${opts.fullname ? ` ${escapeHtml(opts.fullname)}` : ''},</p>
<p>Your seller request${opts.shopName ? ` for <b>${escapeHtml(opts.shopName)}</b>` : ''} has been <b>rejected</b>.</p>
<p><b>Reason:</b> ${escapeHtml(opts.reason)}</p>
<p>Please update your information/documents and re-submit your request.</p>
`.trim();

  return renderEmailLayout({
    title: 'Seller request rejected',
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
