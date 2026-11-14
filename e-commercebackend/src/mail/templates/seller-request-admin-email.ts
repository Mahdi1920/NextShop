import { renderEmailLayout } from './email-layout';

export function renderSellerRequestAdminEmail(opts: {
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
}): string {
  const docsHtml = (opts.documents ?? []).length
    ? `
      <p><b>Documents:</b></p>
      <ul>
        ${(opts.documents ?? []).map((u) => `<li><a href="${u}">${u}</a></li>`).join('')}
      </ul>
    `.trim()
    : '<p><b>Documents:</b> (none uploaded)</p>';

  const body = `
<p><b>New seller request</b></p>
<ul>
  <li><b>Full name:</b> ${escapeHtml(opts.fullname)}</li>
  <li><b>Email:</b> ${escapeHtml(opts.email)}</li>
  ${opts.phone ? `<li><b>Phone:</b> ${escapeHtml(opts.phone)}</li>` : ''}
  ${opts.shopName ? `<li><b>Shop:</b> ${escapeHtml(opts.shopName)}</li>` : ''}
  ${opts.businessEmail ? `<li><b>Business email:</b> ${escapeHtml(opts.businessEmail)}</li>` : ''}
  ${opts.businessPhone ? `<li><b>Business phone:</b> ${escapeHtml(opts.businessPhone)}</li>` : ''}
  ${opts.businessAddress ? `<li><b>Business address:</b> ${escapeHtml(opts.businessAddress)}</li>` : ''}
</ul>

<p><b>Verification details</b></p>
<ul>
  ${opts.identityDocumentType ? `<li><b>Identity document type:</b> ${escapeHtml(opts.identityDocumentType)}</li>` : ''}
  ${opts.businessRegistrationNumber ? `<li><b>Business registration #:</b> ${escapeHtml(opts.businessRegistrationNumber)}</li>` : ''}
  ${opts.bankAccountHolder ? `<li><b>Account holder:</b> ${escapeHtml(opts.bankAccountHolder)}</li>` : ''}
  ${opts.bankIbanMasked ? `<li><b>IBAN:</b> ${escapeHtml(opts.bankIbanMasked)}</li>` : ''}
  ${opts.bankPaymentMethod ? `<li><b>Payment method:</b> ${escapeHtml(opts.bankPaymentMethod)}</li>` : ''}
  ${opts.bankName ? `<li><b>Bank name:</b> ${escapeHtml(opts.bankName)}</li>` : ''}
  ${opts.bankSwift ? `<li><b>SWIFT/BIC:</b> ${escapeHtml(opts.bankSwift)}</li>` : ''}
</ul>
${docsHtml}
<p style="color:#475569;font-size:13px;">Review the request in the admin panel and approve/reject.</p>
`.trim();

  return renderEmailLayout({
    title: 'New seller request',
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
