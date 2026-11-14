import { renderEmailLayout } from './email-layout';

export function renderSellerResubmittedAdminEmail(opts: {
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
}): string {
  const docsHtml = (opts.documents ?? []).length
    ? `
      <p><b>Updated documents:</b></p>
      <ul>
        ${(opts.documents ?? []).map((u) => `<li><a href="${u}">${u}</a></li>`).join('')}
      </ul>
    `.trim()
    : '<p><b>Updated documents:</b> (none uploaded)</p>';

  const body = `
<p><b>Seller request re-submitted</b></p>
<ul>
  <li><b>Full name:</b> ${escapeHtml(opts.fullname)}</li>
  <li><b>Email:</b> ${escapeHtml(opts.email)}</li>
  ${opts.shopName ? `<li><b>Shop:</b> ${escapeHtml(opts.shopName)}</li>` : ''}
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
`.trim();

  return renderEmailLayout({
    title: 'Seller request re-submitted',
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
