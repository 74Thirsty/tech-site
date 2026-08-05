import type { Collector, IntelligenceItem } from "@/intelligence/types";

const CRYPTO_NEWS_SOURCES = [
  {
    name: "CRYPTO_NEWS_CV",
    url: "https://cryptocurrency.cv/api/news",
    transform: (article: Record<string, unknown>): IntelligenceItem => ({
      id: `crypto-cv-${Buffer.from(String(article.url || article.title || "")).toString("base64").slice(0, 12)}`,
      title: String(article.title || ""),
      url: String(article.url || ""),
      source: String(article.source || "CRYPTO_NEWS"),
      summary: String(article.description || article.summary || "").slice(0, 300),
      topics: extractTopics(String(article.title || ""), String(article.description || "")),
      publishedAt: String(article.publishedAt || article.pubDate || new Date().toISOString()),
      metrics: article.sentiment ? { sentiment: Number(article.sentiment) } : undefined,
    }),
  },
  {
    name: "FREE_CRYPTO_NEWS",
    url: "https://free-crypto-news.vercel.app/api/news",
    transform: (article: Record<string, unknown>): IntelligenceItem => ({
      id: `fcnews-${Buffer.from(String(article.url || article.title || "")).toString("base64").slice(0, 12)}`,
      title: String(article.title || ""),
      url: String(article.url || ""),
      source: String(article.source || "FREE_CRYPTO_NEWS"),
      summary: String(article.description || article.summary || "").slice(0, 300),
      topics: extractTopics(String(article.title || ""), String(article.description || "")),
      publishedAt: String(article.publishedAt || article.pubDate || new Date().toISOString()),
    }),
  },
];

function extractTopics(title: string, summary: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const topics: string[] = [];

  const topicMap: Record<string, string[]> = {
    BLOCKCHAIN: ["ethereum", "bitcoin", "blockchain", "layer 2", "rollup", "l2", "solana", "avalanche", "polygon"],
    DEFI: ["defi", "yield", "liquidity", "amm", "dex", "lending", "borrowing", "flash loan", "mev", "tvl", "swap"],
    SMART_CONTRACTS: ["smart contract", "solidity", "vyper", "evm", "bytecode", "opcode", "erc20", "erc721", "erc1155"],
    SECURITY: ["hack", "exploit", "vulnerability", "audit", "attack", "phishing", "scam", "rug pull", "drain"],
    PRIVACY: ["privacy", "zero knowledge", "zkp", "zk-proof", "mixer", "tornado", "monero", "ring signature"],
    AI: ["ai", "artificial intelligence", "machine learning", "neural", "llm", "gpt", "model"],
    LINUX: ["linux", "kernel", "ubuntu", "debian", "arch", "fedora", "container", "docker", "kubernetes"],
    CYBERSECURITY: ["cybersecurity", "malware", "ransomware", "apt", "zero-day", "cve", "penetration", "forensics", "incident response"],
    NETWORKING: ["network", "dns", "vpn", "firewall", "tcp", "http", "tls", "certificate"],
    PROGRAMMING: ["python", "rust", "javascript", "typescript", "golang", "api", "framework", "library"],
    TOKENIZATION: ["tokenization", "rwa", "real world asset", "stablecoin", "cbdc", "commodity"],
    LAYER2: ["layer 2", "rollup", "optimistic", "zk-rollup", "arbitrum", "optimism", "base", "polygon"],
  };

  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(topic);
    }
  }

  if (topics.length === 0) topics.push("BLOCKCHAIN");
  return topics;
}

export const cryptoCollector: Collector = {
  name: "CRYPTO NEWS",
  async collect(): Promise<IntelligenceItem[]> {
    const results = await Promise.allSettled(
      CRYPTO_NEWS_SOURCES.map(async (source) => {
        try {
          const response = await fetch(source.url, {
            next: { revalidate: 900 },
            headers: { "Accept": "application/json" },
          });

          if (!response.ok) {
            throw new Error(`${source.name} returned ${response.status}`);
          }

          const data = await response.json();
          const articles: Record<string, unknown>[] = Array.isArray(data)
            ? data
            : Array.isArray(data.articles)
              ? data.articles
              : Array.isArray(data.data)
                ? data.data
                : [];

          return articles.slice(0, 20).map(source.transform);
        } catch (error) {
          console.error(`Failed to fetch from ${source.name}:`, error);
          return [];
        }
      })
    );

    const items = results
      .filter((r): r is PromiseFulfilledResult<IntelligenceItem[]> => r.status === "fulfilled")
      .flatMap(r => r.value);

    return items.filter(item => item.title && item.url);
  },
};

export const coinGeckoCollector: Collector = {
  name: "COINGECKO TRENDING",
  async collect(): Promise<IntelligenceItem[]> {
    try {
      const data = await fetch("https://api.coingecko.com/api/v3/search/trending", {
        next: { revalidate: 900 },
      }).then(r => r.json());

      return (data.coins ?? []).slice(0, 10).map((entry: { item: { id: string; name: string; symbol: string; data?: { price_change_percentage_24h?: Record<string, number> } } }) => ({
        id: `crypto-${entry.item.id}`,
        title: `${entry.item.name} (${entry.item.symbol.toUpperCase()}) trending on CoinGecko`,
        url: `https://www.coingecko.com/en/coins/${entry.item.id}`,
        source: "COINGECKO",
        summary: `Trending asset in the crypto market. ${entry.item.symbol.toUpperCase()} is currently trending across exchange platforms.`,
        topics: ["BLOCKCHAIN", "MARKETS"],
        publishedAt: new Date().toISOString(),
        metrics: entry.item.data?.price_change_percentage_24h
          ? { trend: Object.values(entry.item.data.price_change_percentage_24h)[0] ?? 0 }
          : undefined,
      }));
    } catch {
      return [];
    }
  },
};
