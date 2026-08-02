export type SeoAnalysis = {
  primaryKeyword: string;
  secondaryKeywords: string[];
  title: string;
  description: string;
  slug: string;
  score: number;
  issues: string[];
  schema: Record<string, unknown>;
  readabilityScore: number;
  engagementScore: number;
  keywordDensity: number;
  metaDescription: string;
  suggestedTitle: string;
  contentGaps: string[];
};
