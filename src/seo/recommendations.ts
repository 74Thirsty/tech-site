import type { SeoAnalysis } from "./types";

export function seoRecommendations(analysis: SeoAnalysis): string[] {
  const recs: string[] = [];

  if (analysis.issues.length > 0) {
    recs.push(...analysis.issues);
  }

  if (analysis.contentGaps.length > 0) {
    recs.push(`Content gaps to fill: ${analysis.contentGaps.join(", ")}`);
  }

  if (analysis.readabilityScore < 70) {
    recs.push("Improve readability: use shorter sentences, simpler words, and more subheadings.");
  }

  if (analysis.engagementScore < 70) {
    recs.push("Boost engagement: add concrete examples, case studies, or actionable takeaways.");
  }

  if (analysis.keywordDensity < 1.5) {
    recs.push(`Increase usage of "${analysis.primaryKeyword}" in headings and body text.`);
  }

  if (recs.length === 0) {
    recs.push(`Build internal links around ${analysis.primaryKeyword}.`);
    recs.push("Repurpose this page into a mission and newsletter section.");
  }

  return recs;
}
