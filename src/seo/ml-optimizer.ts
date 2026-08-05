import { generateContent } from "@/lib/puter";

export type GeminiSeoResult = {
  keywords: string[];
  readabilityScore: number;
  engagementScore: number;
  keywordDensity: number;
  metaDescription: string;
  internalLinks: string[];
  contentGaps: string[];
  suggestedTitle: string;
};

export async function analyzeWithGemini(input: {
  title: string;
  summary: string;
  body?: string;
  topics: string[];
  existingSlugs?: string[];
}): Promise<GeminiSeoResult> {
  const prompt = `You are an SEO expert. Analyze the following article and provide optimization data.

ARTICLE TITLE: ${input.title}
ARTICLE SUMMARY: ${input.summary}
TOPICS: ${input.topics.join(", ")}
${input.body ? `ARTICLE BODY (first 2000 chars): ${input.body.slice(0, 2000)}` : ""}

Respond ONLY with valid JSON (no markdown, no explanation) in this exact format:
{
  "keywords": ["primary keyword", "secondary1", "secondary2", "secondary3", "secondary4", "secondary5"],
  "readabilityScore": 75,
  "engagementScore": 80,
  "keywordDensity": 2.5,
  "metaDescription": "A compelling 150-155 character meta description that includes the primary keyword and encourages clicks.",
  "contentGaps": ["gap1", "gap2", "gap3"],
  "suggestedTitle": "An improved, SEO-optimized title if the current one can be enhanced"
}

Rules:
- readabilityScore: 0-100, how easy to read (Flesch-Kincaid style)
- engagementScore: 0-100, how likely to attract clicks and shares
- keywordDensity: percentage of primary keyword in content (estimate)
- metaDescription: must be 150-155 chars, include primary keyword, be compelling
- contentGaps: 2-3 subtopics not covered that would improve the article
- suggestedTitle: improved title with better keyword targeting, keep under 60 chars
- keywords: 5-8 relevant keywords ranked by importance`;

  const text = await generateContent(prompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse Gemini response as JSON");

  const parsed = JSON.parse(jsonMatch[0]);

  return {
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8) : input.topics,
    readabilityScore: clamp(Number(parsed.readabilityScore) || 70, 0, 100),
    engagementScore: clamp(Number(parsed.engagementScore) || 70, 0, 100),
    keywordDensity: clamp(Number(parsed.keywordDensity) || 2, 0, 100),
    metaDescription: typeof parsed.metaDescription === "string"
      ? parsed.metaDescription.slice(0, 155)
      : input.summary.slice(0, 155),
    internalLinks: Array.isArray(parsed.internalLinks) ? parsed.internalLinks : [],
    contentGaps: Array.isArray(parsed.contentGaps) ? parsed.contentGaps.slice(0, 5) : [],
    suggestedTitle: typeof parsed.suggestedTitle === "string" ? parsed.suggestedTitle : input.title,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
