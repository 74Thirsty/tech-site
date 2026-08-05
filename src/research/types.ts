// ─── Research Pipeline Types ──────────────────────────────────────────────────
// Common format for all research data regardless of source.

export interface ResearchArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  url: string;
  publisher: string;
  publishedAt: string;
  author: string;
  keyword: string;
  source: string;
  fetchedAt: string;
  language: string;
  image?: string;
  sentiment?: number;
}

export interface ResearchGroup {
  id: string;
  topic: string;
  keyword: string;
  articles: ResearchArticle[];
  summary: string;
  keyFacts: string[];
  sources: string[];
  importance: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  recency: number;
  sourceCount: number;
  averageSentiment: number;
  freshnessScore: number;
}

export interface ResearchAnalysis {
  group: ResearchGroup;
  analysis: {
    whatHappened: string;
    isBreaking: boolean;
    isImportant: boolean;
    sourceDisagreement: boolean;
    technicalSignificance: string;
    whyItMatters: string;
    keyEntities: string[];
    relatedTopics: string[];
  };
  researchNotes: string;
}

export interface ArticlePlan {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  difficulty: string;
  readTime: string;
  xp: number;
  excerpt: string;
  tags: string[];
  keywords: string[];
  researchPackage: {
    analysis: ResearchAnalysis[];
    sources: string[];
    facts: string[];
    citations: Array<{ title: string; url: string; publisher: string }>;
  };
}

export interface ResearchConfig {
  keywords: string[];
  maxArticlesPerKeyword: number;
  maxAgeDays: number;
  minSources: number;
  minImportance: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  categories: string[];
  difficulties: string[];
  articlesPerCycle: number;
}

export interface CollectorConfig {
  name: string;
  enabled: boolean;
  apiKey?: string;
  rateLimit?: number;
  timeout?: number;
}
