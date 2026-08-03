import { env } from "@/lib/env";
import { renderNewsletterHtml } from "@/newsletter/templates";

export async function sendSubscriberConfirmation(email: string) {
  if (!env.resendApiKey) return { sent: false, reason: "RESEND_API_KEY is not configured" };

  const html = renderNewsletterHtml(
    "Welcome to The Signal",
    [
      {
        name: "TRANSMISSION RECEIVED",
        whatHappened: "Your subscription to Crystal // Forge has been received.",
        whyItMatters: "You'll receive one concise dispatch every Sunday covering systems, security, and field-tested ideas for builders.",
        yourMove: "Keep an eye on your inbox. The first signal lands this Sunday.",
      },
    ],
    { preheader: "One concise dispatch every Sunday. No spam, ever." },
  );

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.newsletterFrom,
      to: [email],
      subject: "Welcome to The Signal",
      html,
    }),
  });

  if (!response.ok) throw new Error(`Resend request failed: ${response.status}`);
  return { sent: true };
}
