import type { SeoAnalysis } from "./types";
import { analyzeWithGemini, type GeminiSeoResult } from "./ml-optimizer";

export function optimizeSeo(input: {
  title: string;
  summary: string;
  topics: string[];
  slug?: string;
  body?: string;
}): SeoAnalysis {
  const primaryKeyword = input.topics[0]?.toLowerCase() ?? "technology";
  const slug = input.slug ?? input.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const description = input.summary.length > 155 ? `${input.summary.slice(0, 152)}...` : input.summary;
  const issues: string[] = [];
  if (input.title.length < 35) issues.push("Title could target a more specific search intent.");
  if (description.length < 100) issues.push("Meta description should explain the reader outcome.");
  const score = Math.max(0, 100 - issues.length * 15);

  return {
    primaryKeyword,
    secondaryKeywords: input.topics.slice(1),
    title: `${input.title} | Stratagem`,
    description,
    slug,
    score,
    issues,
    readabilityScore: 70,
    engagementScore: 70,
    keywordDensity: 2,
    metaDescription: description,
    suggestedTitle: input.title,
    contentGaps: [],
    schema: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: input.title,
      description,
      keywords: [primaryKeyword, ...input.topics.slice(1)],
    },
  };
}

export async function optimizeSeoWithGemini(input: {
  title: string;
  summary: string;
  topics: string[];
  slug?: string;
  body?: string;
  existingSlugs?: string[];
}): Promise<SeoAnalysis> {
  const base = optimizeSeo(input);

  try {
    const gemini = await analyzeWithGemini(input);
    return mergeWithGemini(base, gemini);
  } catch {
    return base;
  }
}

function mergeWithGemini(base: SeoAnalysis, gemini: GeminiSeoResult): SeoAnalysis {
  const description = gemini.metaDescription.length > 155
    ? `${gemini.metaDescription.slice(0, 152)}...`
    : gemini.metaDescription;

  const primaryKeyword = gemini.keywords[0] ?? base.primaryKeyword;
  const secondaryKeywords = gemini.keywords.slice(1);

  const issues: string[] = [];
  if (gemini.readabilityScore < 60) issues.push("Readability is low. Simplify sentence structure.");
  if (gemini.engagementScore < 60) issues.push("Engagement potential is low. Add more concrete examples.");
  if (gemini.keywordDensity < 1) issues.push("Primary keyword density is too low. Use it more naturally.");
  if (gemini.keywordDensity > 4) issues.push("Primary keyword density is too high. Reduce keyword stuffing.");
  if (description.length < 100) issues.push("Meta description should explain the reader outcome.");
  if (gemini.suggestedTitle !== base.title.replace(" | Stratagem", "")) {
    issues.push(`Consider title: "${gemini.suggestedTitle}"`);
  }

  const score = Math.max(0, 100 - issues.length * 12);

  return {
    primaryKeyword,
    secondaryKeywords,
    title: `${gemini.suggestedTitle} | Stratagem`,
    description,
    slug: base.slug,
    score,
    issues,
    readabilityScore: gemini.readabilityScore,
    engagementScore: gemini.engagementScore,
    keywordDensity: gemini.keywordDensity,
    metaDescription: description,
    suggestedTitle: gemini.suggestedTitle,
    contentGaps: gemini.contentGaps,
    schema: {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: gemini.suggestedTitle,
      description,
      keywords: [primaryKeyword, ...secondaryKeywords],
    },
  };
}
