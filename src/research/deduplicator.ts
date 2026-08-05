import type { ResearchArticle, ResearchGroup } from "./types";

// ─── Research Deduplication Engine ───────────────────────────────────────────
// Groups related articles by comparing titles, URLs, and semantic similarity.
// Keeps one canonical article per group with references to supporting sources.

export function deduplicateResearch(articles: ResearchArticle[]): ResearchGroup[] {
  const groups: ResearchGroup[] = [];
  const assigned = new Set<string>();

  for (const article of articles) {
    if (assigned.has(article.id)) continue;

    const group: ResearchArticle[] = [article];
    assigned.add(article.id);

    for (const candidate of articles) {
      if (assigned.has(candidate.id)) continue;
      if (isRelated(article, candidate)) {
        group.push(candidate);
        assigned.add(candidate.id);
      }
    }

    groups.push(buildGroup(group));
  }

  return groups;
}

function isRelated(a: ResearchArticle, b: ResearchArticle): boolean {
  if (normalizeUrl(a.url) === normalizeUrl(b.url)) return true;
  if (titleSimilarity(a.title, b.title) > 0.7) return true;
  if (shareKeyPhrases(a.title, b.title) > 0.5) return true;
  if (a.publisher === b.publisher && titleSimilarity(a.title, b.title) > 0.4) return true;
  return false;
}

function titleSimilarity(a: string, b: string): number {
  const wordsA = new Set(tokenize(a));
  const wordsB = new Set(tokenize(b));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function shareKeyPhrases(a: string, b: string): number {
  const phrasesA = extractKeyPhrases(a);
  const phrasesB = extractKeyPhrases(b);

  if (phrasesA.length === 0 || phrasesB.length === 0) return 0;

  let matches = 0;
  for (const phrase of phrasesA) {
    if (phrasesB.includes(phrase)) matches++;
  }

  return matches / Math.max(phrasesA.length, phrasesB.length);
}

function extractKeyPhrases(text: string): string[] {
  const words = tokenize(text);
  const phrases: string[] = [];

  for (let i = 0; i < words.length - 1; i++) {
    phrases.push(`${words[i]} ${words[i + 1]}`);
  }

  for (let i = 0; i < words.length - 2; i++) {
    phrases.push(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  }

  return phrases;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3);
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/$/, "").toLowerCase();
  } catch {
    return url.toLowerCase().replace(/\/$/, "");
  }
}

function buildGroup(articles: ResearchArticle[]): ResearchGroup {
  const canonical = articles.reduce((best, current) => {
    const bestScore = sourceCredibility(best.source) + recencyScore(best.publishedAt);
    const currentScore = sourceCredibility(current.source) + recencyScore(current.publishedAt);
    return currentScore > bestScore ? current : best;
  });

  const allSources = [...new Set(articles.map(a => a.publisher))];
  const sentiments = articles.filter(a => a.sentiment !== undefined).map(a => a.sentiment!);
  const avgSentiment = sentiments.length > 0 ? sentiments.reduce((a, b) => a + b, 0) / sentiments.length : 0;

  const ageHours = (Date.now() - new Date(canonical.publishedAt).getTime()) / (1000 * 60 * 60);
  const freshness = Math.max(0, 1 - ageHours / (7 * 24));

  return {
    id: `group-${canonical.id}`,
    topic: canonical.title,
    keyword: canonical.keyword,
    articles,
    summary: canonical.summary,
    keyFacts: extractKeyFacts(articles),
    sources: allSources,
    importance: assessImportance(articles, allSources.length, avgSentiment),
    recency: recencyScore(canonical.publishedAt),
    sourceCount: allSources.length,
    averageSentiment: avgSentiment,
    freshnessScore: freshness,
  };
}

function extractKeyFacts(articles: ResearchArticle[]): string[] {
  const facts: string[] = [];
  const seen = new Set<string>();

  for (const article of articles) {
    const sentences = article.summary.split(/[.!?]+/).filter(s => s.trim().length > 20);
    for (const sentence of sentences.slice(0, 2)) {
      const cleaned = sentence.trim();
      const key = cleaned.toLowerCase().slice(0, 50);
      if (!seen.has(key)) {
        seen.add(key);
        facts.push(cleaned);
      }
    }
  }

  return facts.slice(0, 5);
}

function assessImportance(
  articles: ResearchArticle[],
  sourceCount: number,
  avgSentiment: number
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const diversityScore = sourceCount >= 4 ? 2 : sourceCount >= 2 ? 1 : 0;
  const volumeScore = articles.length >= 10 ? 2 : articles.length >= 5 ? 1 : 0;
  const sentimentScore = Math.abs(avgSentiment) > 5 ? 1 : 0;
  const total = diversityScore + volumeScore + sentimentScore;

  if (total >= 4) return "CRITICAL";
  if (total >= 3) return "HIGH";
  if (total >= 1) return "MEDIUM";
  return "LOW";
}

function sourceCredibility(source: string): number {
  const credible = ["Reuters", "AP", "Bloomberg", "CoinDesk", "The Block", "Ars Technica", "TechCrunch", "Wired"];
  const somewhatCredible = ["Decrypt", "CoinTelegraph", "ZDNet", "The Verge", "Engadget"];

  if (credible.some(s => source.toLowerCase().includes(s.toLowerCase()))) return 2;
  if (somewhatCredible.some(s => source.toLowerCase().includes(s.toLowerCase()))) return 1;
  return 0;
}

function recencyScore(publishedAt: string): number {
  const ageHours = (Date.now() - new Date(publishedAt).getTime()) / (1000 * 60 * 60);
  if (ageHours < 6) return 1.0;
  if (ageHours < 24) return 0.8;
  if (ageHours < 72) return 0.5;
  if (ageHours < 168) return 0.3;
  return 0.1;
}
