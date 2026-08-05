import type { NewsletterIssue } from "./types";
import { generatePremiumGuide, type NewsletterGuide } from "./guide-generator";

// ─── Newsletter Issue Generator ──────────────────────────────────────────────
// Generates a complete newsletter issue from the research pipeline.
// No hardcoded content — everything comes from Gemini + live research.

let cachedGuide: NewsletterGuide | null = null;

export async function generateIssue(): Promise<{
  issue: NewsletterIssue;
  guide: NewsletterGuide;
}> {
  const guide = await generatePremiumGuide();
  cachedGuide = guide;

  const issue: NewsletterIssue = {
    id: guide.id,
    subject: guide.subject,
    status: guide.status,
    topics: guide.topics,
    openRate: 0,
    clickRate: 0,
    revenue: 0,
  };

  return { issue, guide };
}

export function getCachedGuide(): NewsletterGuide | null {
  return cachedGuide;
}

export function clearCachedGuide(): void {
  cachedGuide = null;
}
