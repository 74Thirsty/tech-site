import type { NewsletterGuide } from "./guide-generator";
import { renderNewsletterHtml, type NewsletterSection } from "./templates";

// ─── Newsletter Assembler ────────────────────────────────────────────────────
// Assembles a complete newsletter from a research-generated guide.
// No hardcoded sections — everything comes from the guide.

export function assembleNewsletter(guide: NewsletterGuide): {
  html: string;
  sections: NewsletterSection[];
  status: "NEEDS_REVIEW" | "READY" | "SENT";
} {
  const sections: NewsletterSection[] = [
    {
      name: "THE SIGNAL",
      raw: guide.mainGuide,
    },
    {
      name: "SUMMARY",
      whatHappened: guide.summary,
    },
  ];

  if (guide.learningObjectives.length > 0) {
    sections.push({
      name: "WHAT YOU'LL LEARN",
      items: guide.learningObjectives.map((obj) => ({
        title: obj,
        body: "",
      })),
    });
  }

  if (guide.furtherReading.length > 0) {
    sections.push({
      name: "FURTHER READING",
      items: guide.furtherReading.map((r) => ({
        title: r.split("—")[0]?.trim() || r,
        body: r.split("—")[1]?.trim() || "",
        href: r.match(/https?:\/\/[^\s]+/)?.[0],
      })),
    });
  }

  const html = renderNewsletterHtml(guide.subject, sections);

  return { html, sections, status: "NEEDS_REVIEW" };
}
