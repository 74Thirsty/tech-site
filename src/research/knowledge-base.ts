import { supabaseRequest } from "@/lib/supabase";
import type { ResearchArticle, ResearchGroup, ResearchAnalysis } from "./types";

// ─── Research Knowledge Base ─────────────────────────────────────────────────
// Persistent storage via Supabase. Works on Vercel serverless.
// Falls back gracefully if Supabase is not configured.

export async function storeResearchArticles(articles: ResearchArticle[]): Promise<number> {
  let stored = 0;
  for (const article of articles) {
    try {
      await supabaseRequest("research_articles", {
        method: "POST",
        body: JSON.stringify({
          external_id: article.id,
          title: article.title,
          summary: article.summary,
          content: article.content,
          url: article.url,
          publisher: article.publisher,
          published_at: article.publishedAt,
          author: article.author,
          keyword: article.keyword,
          source: article.source,
          fetched_at: article.fetchedAt,
          language: article.language,
          image: article.image || null,
          sentiment: article.sentiment ?? null,
        }),
      });
      stored++;
    } catch {
      // Article may already exist (duplicate external_id) — skip silently
    }
  }
  return stored;
}

export async function storeResearchGroups(groups: ResearchGroup[]): Promise<number> {
  let stored = 0;
  for (const group of groups) {
    try {
      await supabaseRequest("research_groups", {
        method: "POST",
        body: JSON.stringify({
          external_id: group.id,
          topic: group.topic,
          keyword: group.keyword,
          summary: group.summary,
          key_facts: group.keyFacts,
          sources: group.sources,
          importance: group.importance,
          recency: group.recency,
          source_count: group.sourceCount,
          average_sentiment: group.averageSentiment,
          freshness_score: group.freshnessScore,
          article_ids: group.articles.map(a => a.id),
          article_count: group.articles.length,
        }),
      });
      stored++;
    } catch {
      // Group may already exist — skip silently
    }
  }
  return stored;
}

export async function storeResearchAnalyses(analyses: ResearchAnalysis[]): Promise<number> {
  let stored = 0;
  for (const analysis of analyses) {
    try {
      await supabaseRequest("research_analyses", {
        method: "POST",
        body: JSON.stringify({
          group_external_id: analysis.group.id,
          what_happened: analysis.analysis.whatHappened,
          is_breaking: analysis.analysis.isBreaking,
          is_important: analysis.analysis.isImportant,
          source_disagreement: analysis.analysis.sourceDisagreement,
          technical_significance: analysis.analysis.technicalSignificance,
          why_it_matters: analysis.analysis.whyItMatters,
          key_entities: analysis.analysis.keyEntities,
          related_topics: analysis.analysis.relatedTopics,
          research_notes: analysis.researchNotes,
        }),
      });
      stored++;
    } catch {
      // Analysis may already exist — skip silently
    }
  }
  return stored;
}

export async function pruneOldResearch(): Promise<{ articles: number; groups: number; analyses: number }> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  let articles = 0, groups = 0, analyses = 0;
  try {
    const res = await supabaseRequest<Array<{ id: string }>>(
      `research_articles?created_at=lt.${encodeURIComponent(cutoff)}&select=id`,
      { method: "GET" }
    );
    if (res?.length) {
      for (const row of res) {
        await supabaseRequest(`research_articles?id=eq.${row.id}`, { method: "DELETE" });
      }
      articles = res.length;
    }
  } catch { /* best-effort */ }
  try {
    const groupRes = await supabaseRequest<Array<{ id: string }>>(
      `research_groups?created_at=lt.${encodeURIComponent(cutoff)}&select=id`,
      { method: "GET" }
    );
    if (groupRes?.length) {
      for (const row of groupRes) {
        await supabaseRequest(`research_groups?id=eq.${row.id}`, { method: "DELETE" });
      }
      groups = groupRes.length;
    }
  } catch { /* best-effort */ }
  try {
    const analysisRes = await supabaseRequest<Array<{ id: string }>>(
      `research_analyses?created_at=lt.${encodeURIComponent(cutoff)}&select=id`,
      { method: "GET" }
    );
    if (analysisRes?.length) {
      for (const row of analysisRes) {
        await supabaseRequest(`research_analyses?id=eq.${row.id}`, { method: "DELETE" });
      }
      analyses = analysisRes.length;
    }
  } catch { /* best-effort */ }
  return { articles, groups, analyses };
}

export async function getRecentArticles(keyword?: string): Promise<ResearchArticle[]> {
  try {
    const filter = keyword ? `keyword=eq.${encodeURIComponent(keyword)}&` : "";
    const results = await supabaseRequest<Array<Record<string, unknown>>>(
      `research_articles?${filter}select=*&order=fetched_at.desc&limit=200`,
      { method: "GET" }
    );
    if (!results) return [];
    return results.map(mapDbToArticle);
  } catch {
    return [];
  }
}

export async function getRecentGroups(): Promise<ResearchGroup[]> {
  try {
    const results = await supabaseRequest<Array<Record<string, unknown>>>(
      "research_groups?select=*&order=freshness_score.desc&limit=100",
      { method: "GET" }
    );
    if (!results) return [];
    return results.map(mapDbToGroup);
  } catch {
    return [];
  }
}

export async function getResearchStats(): Promise<{
  totalArticles: number;
  totalGroups: number;
  totalAnalyses: number;
  sourcesBreakdown: Record<string, number>;
  keywordsBreakdown: Record<string, number>;
}> {
  const articles = await getRecentArticles();
  const groups = await getRecentGroups();

  const sourcesBreakdown: Record<string, number> = {};
  const keywordsBreakdown: Record<string, number> = {};

  for (const article of articles) {
    sourcesBreakdown[article.source] = (sourcesBreakdown[article.source] || 0) + 1;
    keywordsBreakdown[article.keyword] = (keywordsBreakdown[article.keyword] || 0) + 1;
  }

  let analysisCount = 0;
  try {
    const results = await supabaseRequest<Array<Record<string, unknown>>>(
      "research_analyses?select=id&limit=1",
      { method: "GET" }
    );
    analysisCount = results?.length ?? 0;
  } catch {
    analysisCount = 0;
  }

  return {
    totalArticles: articles.length,
    totalGroups: groups.length,
    totalAnalyses: analysisCount,
    sourcesBreakdown,
    keywordsBreakdown,
  };
}

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapDbToArticle(row: Record<string, unknown>): ResearchArticle {
  return {
    id: String(row.external_id || row.id || ""),
    title: String(row.title || ""),
    summary: String(row.summary || ""),
    content: String(row.content || ""),
    url: String(row.url || ""),
    publisher: String(row.publisher || ""),
    publishedAt: String(row.published_at || ""),
    author: String(row.author || ""),
    keyword: String(row.keyword || ""),
    source: String(row.source || ""),
    fetchedAt: String(row.fetched_at || ""),
    language: String(row.language || "en"),
    image: row.image ? String(row.image) : undefined,
    sentiment: row.sentiment != null ? Number(row.sentiment) : undefined,
  };
}

function mapDbToGroup(row: Record<string, unknown>): ResearchGroup {
  return {
    id: String(row.external_id || row.id || ""),
    topic: String(row.topic || ""),
    keyword: String(row.keyword || ""),
    articles: [],
    summary: String(row.summary || ""),
    keyFacts: Array.isArray(row.key_facts) ? row.key_facts as string[] : [],
    sources: Array.isArray(row.sources) ? row.sources as string[] : [],
    importance: String(row.importance || "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
    recency: Number(row.recency || 0),
    sourceCount: Number(row.source_count || 0),
    averageSentiment: Number(row.average_sentiment || 0),
    freshnessScore: Number(row.freshness_score || 0),
  };
}
