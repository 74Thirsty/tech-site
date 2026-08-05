import { env } from "@/lib/env";
import type { Collector, IntelligenceItem } from "@/intelligence/types";

export const cryptopanicCollector: Collector = {
  name: "CRYPTOPANIC",
  async collect(): Promise<IntelligenceItem[]> {
    if (!env.cryptopanicApiKey) {
      console.warn("CRYPTOPANIC_API_KEY not set, skipping CryptoPanic");
      return [];
    }

    try {
      const response = await fetch(
        `https://cryptopanic.com/api/v1/posts/?auth_token=${env.cryptopanicApiKey}&filter=hot&public=true`,
        { next: { revalidate: 900 } }
      );

      if (!response.ok) {
        throw new Error(`CryptoPanic returned ${response.status}`);
      }

      const data = await response.json();
      const posts: Array<Record<string, unknown>> = data.results || [];

      return posts.slice(0, 20).map((post): IntelligenceItem => ({
        id: `cp-${post.id || Buffer.from(String(post.url || post.title || "")).toString("base64").slice(0, 12)}`,
        title: String(post.title || ""),
        url: String(post.url || ""),
        source: "CRYPTOPANIC",
        summary: String(post.description || "").slice(0, 300),
        topics: extractCryptoTopics(String(post.title || ""), String(post.description || "")),
        publishedAt: String(post.published_at || post.created_at || new Date().toISOString()),
        metrics: {
          votes: Number(post.votes || 0),
        },
      }));
    } catch (error) {
      console.error("CryptoPanic collector failed:", error);
      return [];
    }
  },
};

function extractCryptoTopics(title: string, summary: string): string[] {
  const text = `${title} ${summary}`.toLowerCase();
  const topics: string[] = [];

  const topicMap: Record<string, string[]> = {
    BLOCKCHAIN: ["ethereum", "bitcoin", "blockchain", "layer 2", "rollup", "solana", "avalanche", "polygon", "base"],
    DEFI: ["defi", "yield", "liquidity", "amm", "dex", "lending", "flash loan", "mev", "tvl", "swap", "aave", "uniswap"],
    SMART_CONTRACTS: ["smart contract", "solidity", "evm", "erc20", "erc721", "bytecode"],
    SECURITY: ["hack", "exploit", "vulnerability", "attack", "phishing", "scam", "rug pull", "drain"],
    PRIVACY: ["privacy", "zero knowledge", "zkp", "mixer", "monero"],
    TOKENIZATION: ["tokenization", "rwa", "real world asset", "stablecoin", "cbdc"],
    LAYER2: ["layer 2", "rollup", "optimistic", "zk-rollup", "arbitrum", "optimism"],
    MARKETS: ["price", "rally", "crash", "bull", "bear", "market", "trading"],
  };

  for (const [topic, keywords] of Object.entries(topicMap)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(topic);
    }
  }

  if (topics.length === 0) topics.push("BLOCKCHAIN");
  return topics;
}
