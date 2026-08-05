import type { ResearchArticle } from "./types";

// ─── Research Normalizer ─────────────────────────────────────────────────────
// Converts all API responses to a common ResearchArticle format.
// Each collector normalizes its data to this format before storage.

export function normalizeResearchArticle(input: {
  title: string;
  summary: string;
  content?: string;
  url: string;
  publisher: string;
  publishedAt: string;
  author?: string;
  keyword: string;
  source: string;
  language?: string;
  image?: string;
  sentiment?: number;
}): ResearchArticle {
  return {
    id: generateId(input.url, input.title),
    title: cleanText(input.title),
    summary: cleanText(input.summary).slice(0, 500),
    content: cleanText(input.content || input.summary).slice(0, 2000),
    url: input.url,
    publisher: input.publisher,
    publishedAt: input.publishedAt || new Date().toISOString(),
    author: input.author || "",
    keyword: input.keyword,
    source: input.source,
    fetchedAt: new Date().toISOString(),
    language: input.language || "en",
    image: input.image,
    sentiment: input.sentiment,
  };
}

export function normalizeCryptoPanic(
  post: Record<string, unknown>,
  keyword: string
): ResearchArticle {
  const currencies = (post.currencies as Array<{ code: string }>) || [];
  return normalizeResearchArticle({
    title: String(post.title || ""),
    summary: String(post.description || post.body || ""),
    url: String(post.url || ""),
    publisher: String((post.source as Record<string, unknown>)?.title || "CryptoPanic"),
    publishedAt: String(post.published_at || post.created_at || new Date().toISOString()),
    keyword,
    source: "CRYPTOPANIC",
    sentiment: post.votes ? Number(post.votes) > 0 ? 1 : -1 : 0,
  });
}

export function normalizeGdelt(
  article: Record<string, unknown>,
  keyword: string
): ResearchArticle {
  return normalizeResearchArticle({
    title: String(article.title || ""),
    summary: String(article.title || ""),
    url: String(article.url || ""),
    publisher: String(article.domain || "Unknown"),
    publishedAt: String(article.seendate || new Date().toISOString()),
    author: String(article.author || ""),
    keyword,
    source: "GDELT",
    image: String(article.socialimage || ""),
    sentiment: Number(article.tone || 0),
  });
}

export function normalizeNewsData(
  article: Record<string, unknown>,
  keyword: string
): ResearchArticle {
  return normalizeResearchArticle({
    title: String(article.title || ""),
    summary: String(article.description || ""),
    url: String(article.link || ""),
    publisher: String(article.source_name || "NewsData"),
    publishedAt: String(article.pubDate || new Date().toISOString()),
    keyword,
    source: "NEWSDATA",
    image: String(article.image_url || ""),
    sentiment: article.sentiment ? Number(article.sentiment) : undefined,
  });
}

export function normalizeNewsApi(
  article: Record<string, unknown>,
  keyword: string
): ResearchArticle {
  const source = article.source as Record<string, string> | undefined;
  return normalizeResearchArticle({
    title: String(article.title || ""),
    summary: String(article.description || ""),
    url: String(article.url || ""),
    publisher: String(source?.name || "NewsAPI"),
    publishedAt: String(article.publishedAt || new Date().toISOString()),
    keyword,
    source: "NEWSAPI",
    image: String(article.urlToImage || ""),
  });
}

export function normalizeHackerNews(
  item: Record<string, unknown>,
  keyword: string
): ResearchArticle {
  return normalizeResearchArticle({
    title: String(item.title || ""),
    summary: String(item.text || `Score: ${item.score || 0}. ${item.descendants || 0} comments.`),
    url: String(item.url || `https://news.ycombinator.com/item?id=${item.id}`),
    publisher: "Hacker News",
    publishedAt: item.time ? new Date(Number(item.time) * 1000).toISOString() : new Date().toISOString(),
    author: String(item.by || ""),
    keyword,
    source: "HACKERNEWS",
  });
}

export function normalizeGitHub(
  repo: Record<string, unknown>,
  keyword: string
): ResearchArticle {
  return normalizeResearchArticle({
    title: String(repo.full_name || repo.name || ""),
    summary: String(repo.description || `Stars: ${repo.stargazers_count || 0}. Language: ${repo.language || "unknown"}.`),
    url: String(repo.html_url || ""),
    publisher: "GitHub",
    publishedAt: String(repo.updated_at || repo.pushed_at || new Date().toISOString()),
    author: String((repo.owner as Record<string, unknown>)?.login || ""),
    keyword,
    source: "GITHUB",
  });
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function generateId(url: string, title: string): string {
  const base = url || title;
  return Buffer.from(base).toString("base64").slice(0, 16);
}
