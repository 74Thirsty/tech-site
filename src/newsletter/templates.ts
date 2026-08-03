export type NewsletterSection = {
  name: string;
  whatHappened?: string;
  whyItMatters?: string;
  yourMove?: string;
  items?: Array<{ title: string; body: string; href?: string }>;
  raw?: string;
};

export const newsletterTemplate = {
  preheader: "A concise dispatch for the technically curious.",
  sender: "Crystal // Forge",
  senderUrl: "https://neon-forge.dev",
  sections: [
    "THE SIGNAL",
    "FIELD NOTE",
    "MISSION OF THE WEEK",
    "ONE THING TO READ",
    "THE PATCH",
    "THE UPGRADE",
  ] as const,
  colors: {
    bg: "#0a0a0d",
    card: "#111116",
    accent: "#00ff88",
    text: "#e0e0e0",
    muted: "#707080",
    border: "#222232",
  },
  fonts: {
    body: "Space Grotesk, -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'DM Mono', monospace",
  },
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderSection(section: NewsletterSection): string {
  const parts: string[] = [];

  parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">`);
  parts.push(`<tr><td style="padding:20px 0 0 0;"><hr style="border:none;border-top:1px solid ${newsletterTemplate.colors.border};margin:0;"></td></tr></table>`);

  if (section.items && section.items.length > 0) {
    parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">`);
    for (const item of section.items) {
      parts.push(`<tr><td style="padding:16px 0;border-bottom:1px solid ${newsletterTemplate.colors.border};">`);
      if (item.href) {
        parts.push(`<h3 style="margin:0 0 8px 0;font-size:18px;line-height:1.3;">`);
        parts.push(`<a href="${escapeHtml(item.href)}" style="color:${newsletterTemplate.colors.accent};text-decoration:none;">${escapeHtml(item.title)}</a>`);
        parts.push(`</h3>`);
      } else {
        parts.push(`<h3 style="margin:0 0 8px 0;font-size:18px;line-height:1.3;color:${newsletterTemplate.colors.text};">${escapeHtml(item.title)}</h3>`);
      }
      parts.push(`<p style="margin:0;font-size:15px;line-height:1.6;color:${newsletterTemplate.colors.text};">${escapeHtml(item.body)}</p>`);
      parts.push(`</td></tr>`);
    }
    parts.push(`</table>`);
  }

  const fields: Array<{ label: string; value?: string }> = [
    { label: section.name, value: undefined },
    { label: "WHAT HAPPENED", value: section.whatHappened },
    { label: "WHY IT MATTERS", value: section.whyItMatters },
    { label: "YOUR MOVE", value: section.yourMove },
  ];

  parts.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0">`);
  let headerPrinted = false;
  for (const { label, value } of fields) {
    if (value === undefined || value === "") continue;
    if (!headerPrinted) {
      parts.push(`<tr><td style="padding-bottom:8px;"><span style="font-family:${newsletterTemplate.fonts.mono};font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${newsletterTemplate.colors.muted};">${escapeHtml(label)}</span></td></tr>`);
      headerPrinted = true;
    } else {
      parts.push(`<tr><td style="padding-top:16px 0;padding-bottom:4px;"><span style="font-family:${newsletterTemplate.fonts.mono};font-size:11px;text-transform:uppercase;letter-spacing:1px;color:${newsletterTemplate.colors.muted};">${escapeHtml(label)}</span></td></tr>`);
    }
    parts.push(`<tr><td style="padding-bottom:4px;"><p style="margin:0;font-size:16px;line-height:1.6;color:${newsletterTemplate.colors.text};">${escapeHtml(value)}</p></td></tr>`);
  }
  if (section.raw) {
    if (!headerPrinted) {
      parts.push(`<tr><td style="padding-bottom:8px;"><span style="font-family:${newsletterTemplate.fonts.mono};font-size:12px;text-transform:uppercase;letter-spacing:1px;color:${newsletterTemplate.colors.muted};">${escapeHtml(section.name)}</span></td></tr>`);
      headerPrinted = true;
    }
    parts.push(`<tr><td style="padding-top:8px 0;"><div style="font-size:15px;line-height:1.6;color:${newsletterTemplate.colors.text};">${section.raw}</div></td></tr>`);
  }
  parts.push(`</table>`);

  return parts.join("");
}

export function renderNewsletterHtml(
  subject: string,
  sections: NewsletterSection[],
  opts?: { preheader?: string; unsubscribeUrl?: string },
): string {
  const preheader = opts?.preheader ?? newsletterTemplate.preheader;

  const sectionHtml = sections.map(renderSection).join("\n");

  const unsubscribeUrl = opts?.unsubscribeUrl;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:${newsletterTemplate.colors.bg};font-family:${newsletterTemplate.fonts.body};color:${newsletterTemplate.colors.text};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background-color:${newsletterTemplate.colors.bg};">
<tr>
<td style="padding:40px 24px;">
<span style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</span>

<!-- Header -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
<tr>
<td>
<a href="${newsletterTemplate.senderUrl}" style="color:${newsletterTemplate.colors.accent};text-decoration:none;font-family:${newsletterTemplate.fonts.mono};font-size:14px;font-weight:500;">${newsletterTemplate.sender}</a>
</td>
</tr>
<tr>
<td style="padding-top:16px;">
<h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.5px;color:${newsletterTemplate.colors.text};">${escapeHtml(subject)}</h1>
</td>
</tr>
</table>

<!-- Preheader -->
<p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${newsletterTemplate.colors.muted};font-style:italic;">${escapeHtml(preheader)}</p>

${sectionHtml}

<!-- Footer -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid ${newsletterTemplate.colors.border};">
<tr>
<td style="padding-top:24px;">
<p style="margin:0;font-size:12px;line-height:1.6;color:${newsletterTemplate.colors.muted};font-family:${newsletterTemplate.fonts.mono};">
You received this transmission from Crystal // Forge.<br>
One concise dispatch every Sunday.<br>
${newsletterTemplate.senderUrl}
</p>
${unsubscribeUrl ? `<p style="margin:0;font-size:12px;line-height:1.6;color:${newsletterTemplate.colors.muted};font-family:${newsletterTemplate.fonts.mono};margin-top:12px;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:${newsletterTemplate.colors.muted};text-decoration:none;font-size:12px;">UNSUBSCRIBE</a></p>` : ""}
</td>
</tr>
</table>

</td>
</tr>
</table>
</body>
</html>`;
}
