import type { Collector, IntelligenceItem } from "@/intelligence/types";

export const gdeltCollector: Collector = {
  name: "GDELT",
  async collect(): Promise<IntelligenceItem[]> {
    const queries = [
      "cybersecurity",
      "blockchain ethereum",
      "AI artificial intelligence",
      "linux open source",
      "privacy encryption",
      "smart contract",
      "DeFi cryptocurrency",
    ];

    const results = await Promise.allSettled(
      queries.map(async (query) => {
        try {
          const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=10&format=json&sort=DateDesc`;
          const response = await fetch(url, { next: { revalidate: 900 } });

          if (!response.ok) {
            throw new Error(`GDELT returned ${response.status} for query: ${query}`);
          }

          const data = await response.json();
          const articles: Array<Record<string, unknown>> = data.articles || [];

          return articles.map((article): IntelligenceItem => ({
            id: `gdelt-${Buffer.from(String(article.url || article.title || "")).toString("base64").slice(0, 12)}`,
            title: String(article.title || ""),
            url: String(article.url || ""),
            source: String(article.domain || "GDELT"),
            summary: String(article.socialimage ? `${article.title} — Source: ${article.domain}` : article.title || "").slice(0, 300),
            topics: extractGdeltTopics(String(article.title || ""), String(article.domain || ""), query),
            publishedAt: String(article.seendate || new Date().toISOString()),
            metrics: {
              tone: Number(article.tone || 0),
              socialImage: article.socialimage ? 1 : 0,
            },
          }));
        } catch (error) {
          console.error(`GDELT query "${query}" failed:`, error);
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

function extractGdeltTopics(title: string, domain: string, query: string): string[] {
  const text = `${title} ${domain} ${query}`.toLowerCase();
  const topics: string[] = [];

  const topicMap: Record<string, string[]> = {
    BLOCKCHAIN: ["ethereum", "bitcoin", "blockchain", "crypto", "defi", "web3", "solana"],
    SECURITY: ["cybersecurity", "hack", "breach", "vulnerability", "malware", "ransomware", "zero-day", "apt", "cve"],
    AI: ["artificial intelligence", "ai", "machine learning", "neural", "llm", "gpt", "model"],
    LINUX: ["linux", "kernel", "ubuntu", "debian", "open source", "foss"],
    PRIVACY: ["privacy", "encryption", "surveillance", "data protection", "gdpr"],
    PROGRAMMING: ["programming", "developer", "software", "code", "api"],
    NETWORKING: ["network", "dns", "5g", "infrastructure"],
  };

  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(topic);
    }
  }

  if (topics.length === 0) topics.push("TECHNOLOGY");
  return topics;
}
