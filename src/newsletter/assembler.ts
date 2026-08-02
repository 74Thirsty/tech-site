import type { ArticlePlan } from "@/editorial/types";
import { buildNewsletterSection } from "@/distribution/newsletter-builder";
import type { NewsletterSection } from "@/newsletter/templates";

export function assembleNewsletter(plan: ArticlePlan): {
  sections: NewsletterSection[];
  status: "NEEDS_REVIEW" | "READY" | "SENT";
} {
  const signalSection: NewsletterSection = buildNewsletterSection(plan);

  const sections: NewsletterSection[] = [
    signalSection,
    {
      name: "THE PATCH",
      whatHappened: "Security updates are reviewed in the lab.",
      whyItMatters: "Small fixes compound into resilient systems.",
      yourMove: "Run one check against your own stack.",
    },
    {
      name: "THE UPGRADE",
      whatHappened: "A related field guide is waiting in the Vault.",
      yourMove: "Open the vault and read one mission.",
    },
  ];

  return { sections, status: "NEEDS_REVIEW" };
}
