import { env } from "@/lib/env";
import { renderNewsletterHtml, type NewsletterSection } from "@/newsletter/templates";

export async function deliverNewsletter(
  to: string[],
  subject: string,
  html: string,
): Promise<{ sent: boolean; reason?: string }>;
export async function deliverNewsletter(
  to: string[],
  subject: string,
  sections: NewsletterSection[],
  opts?: { preheader?: string; unsubscribeUrl?: string },
): Promise<{ sent: boolean; reason?: string }>;
export async function deliverNewsletter(
  to: string[],
  subject: string,
  content: string | NewsletterSection[],
  opts: { preheader?: string; unsubscribeUrl?: string } = {},
): Promise<{ sent: boolean; reason?: string }> {
  if (!env.resendApiKey) return { sent: false, reason: "RESEND_API_KEY is not configured" };

  const html =
    typeof content === "string"
      ? content
      : renderNewsletterHtml(subject, content, opts);

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.newsletterFrom,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) throw new Error(`Newsletter delivery failed: ${response.status}`);
  return { sent: true };
}
