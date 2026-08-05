import { env } from "@/lib/env";
import type { Collector, IntelligenceItem } from "@/intelligence/types";

export const newsdataCollector: Collector = {
  name: "NEWSDATA",
  async collect(): Promise<IntelligenceItem[]> {
    if (!env.newsdataApiKey) {
      console.warn("NEWSDATA_API_KEY not set, skipping NewsData.io");
      return [];
    }

    const categories = [
      "technology",
      "science",
      "business",
    ];

    const results = await Promise.allSettled(
      categories.map(async (category) => {
        try {
          const url = `https://newsdata.io/api/1/latest?apikey=${env.newsdataApiKey}&category=${category}&language=en&size=10`;
          const response = await fetch(url, { next: { revalidate: 900 } });

          if (!response.ok) {
            throw new Error(`NewsData.io returned ${response.status} for category: ${category}`);
          }

          const data = await response.json();
          const articles: Array<Record<string, unknown>> = data.results || [];

          return articles.map((article): IntelligenceItem => ({
            id: `nd-${article.article_id || Buffer.from(String(article.link || article.title || "")).toString("base64").slice(0, 12)}`,
            title: String(article.title || ""),
            url: String(article.link || ""),
            source: String(article.source_name || "NEWSDATA"),
            summary: String(article.description || "").slice(0, 300),
            topics: extractNewsdataTopics(String(article.title || ""), String(article.description || ""), category),
            publishedAt: String(article.pubDate || new Date().toISOString()),
            metrics: {
              sentiment: article.sentiment ? Number(article.sentiment) : undefined,
              keywords: Array.isArray(article.keywords) ? article.keywords.length : 0,
            } as Record<string, number>,
          }));
        } catch (error) {
          console.error(`NewsData.io category "${category}" failed:`, error);
          return [];
        }
      })
    );

    return results
      .filter((r): r is PromiseFulfilledResult<IntelligenceItem[]> => r.status === "fulfilled")
      .flatMap(r => r.value)
      .filter(item => item.title && item.url);
  },
};

function extractNewsdataTopics(title: string, summary: string, category: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const topics: string[] = [];

  if (category === "technology") topics.push("TECHNOLOGY");

  const topicMap: Record<string, string[]> = {
    BLOCKCHAIN: ["ethereum", "bitcoin", "blockchain", "crypto", "defi", "web3", "smart contract", "tokenization"],
    SECURITY: ["cybersecurity", "hack", "breach", "vulnerability", "malware", "ransomware", "zero-day", "encryption"],
    AI: ["artificial intelligence", "ai", "machine learning", "neural", "llm", "gpt", "chatbot", "automation"],
    LINUX: ["linux", "kernel", "open source", "foss", "ubuntu", "debian"],
    PRIVACY: ["privacy", "surveillance", "data protection", "gdpr", "tracking"],
    PROGRAMMING: ["programming", "developer", "software", "code", "api", "framework"],
    NETWORKING: ["network", "dns", "5g", "internet", "infrastructure", "cloud"],
    DEFI: ["defi", "yield", "liquidity", "dex", "lending", "flash loan"],
  };

  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(topic);
    }
  }

  if (topics.length === 0) topics.push("TECHNOLOGY");
  return topics;
}
