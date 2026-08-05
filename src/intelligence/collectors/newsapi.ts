import { env } from "@/lib/env";
import type { Collector, IntelligenceItem } from "@/intelligence/types";

export const newsapiCollector: Collector = {
  name: "NEWSAPI",
  async collect(): Promise<IntelligenceItem[]> {
    if (!env.newsapiKey) {
      console.warn("NEWS_API_KEY not set, skipping NewsAPI");
      return [];
    }

    const queries = [
      "cybersecurity",
      "blockchain",
      "artificial intelligence",
      "linux",
      "privacy encryption",
    ];

    const results = await Promise.allSettled(
      queries.map(async (query) => {
        try {
          const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${env.newsapiKey}`;
          const response = await fetch(url, { next: { revalidate: 900 } });

          if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`NewsAPI returned ${response.status}: ${errBody}`);
          }

          const data = await response.json();
          const articles: Array<Record<string, unknown>> = data.articles || [];

          return articles.map((article): IntelligenceItem => ({
            id: `newsapi-${Buffer.from(String(article.url || article.title || "")).toString("base64").slice(0, 12)}`,
            title: String(article.title || ""),
            url: String(article.url || ""),
            source: String((article.source as Record<string, unknown>)?.name || "NEWSAPI"),
            summary: String(article.description || "").slice(0, 300),
            topics: extractNewsapiTopics(String(article.title || ""), String(article.description || ""), query),
            publishedAt: String(article.publishedAt || new Date().toISOString()),
          }));
        } catch (error) {
          console.error(`NewsAPI query "${query}" failed:`, error);
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

function extractNewsapiTopics(title: string, summary: string, query: string): string[] {
  const text = `${title} ${summary} ${query}`.toLowerCase();
  const topics: string[] = [];

  const topicMap: Record<string, string[]> = {
    BLOCKCHAIN: ["ethereum", "bitcoin", "blockchain", "crypto", "defi", "web3", "solana", "smart contract"],
    SECURITY: ["cybersecurity", "hack", "breach", "vulnerability", "malware", "ransomware", "zero-day", "apt", "cve", "encryption"],
    AI: ["artificial intelligence", "ai", "machine learning", "neural", "llm", "gpt", "model", "automation"],
    LINUX: ["linux", "kernel", "open source", "foss", "ubuntu", "debian"],
    PRIVACY: ["privacy", "surveillance", "data protection", "gdpr", "tracking"],
    PROGRAMMING: ["programming", "developer", "software", "code", "api"],
    NETWORKING: ["network", "dns", "5g", "internet", "infrastructure"],
  };

  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(topic);
    }
  }

  if (topics.length === 0) topics.push("TECHNOLOGY");
  return topics;
}
