export function renderEmailLayout(opts: {
  title: string;
  bodyHtml: string;
  footerText?: string;
}): string {
  const footer = opts.footerText ?? "NextShop";

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:24px;">
      <div style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e9ecf3;">
        <div style="padding:18px 20px;background:linear-gradient(135deg,#0f172a,#1d4ed8);color:#fff;">
          <div style="font-size:18px;font-weight:700;">NextShop</div>
          <div style="font-size:13px;opacity:.9;">${escapeHtml(opts.title)}</div>
        </div>
        <div style="padding:20px;line-height:1.6;color:#0f172a;">
          ${opts.bodyHtml}
        </div>
      </div>
      <div style="padding:12px 6px;color:#64748b;font-size:12px;text-align:center;">
        ${escapeHtml(footer)}
      </div>
    </div>
  </body>
</html>
`.trim();
}

function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
