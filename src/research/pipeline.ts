import { env } from "@/lib/env";
import type { ResearchArticle, ResearchGroup, ResearchAnalysis, ArticlePlan, ResearchConfig } from "./types";
import { normalizeResearchArticle, normalizeGdelt, normalizeNewsData, normalizeNewsApi, normalizeHackerNews, normalizeGitHub } from "./normalizer";
import { deduplicateResearch } from "./deduplicator";
import { analyzeResearchGroups } from "./analyzer";
import { planArticles } from "./planner";
import { storeResearchArticles, storeResearchGroups, storeResearchAnalyses, getResearchStats } from "./knowledge-base";
import { githubCollector } from "@/intelligence/collectors/github";
import { hackerNewsCollector } from "@/intelligence/collectors/hackernews";
import { cveCollector } from "@/intelligence/collectors/cve";
import { cryptoCollector, coinGeckoCollector } from "@/intelligence/collectors/crypto";
import { cryptopanicCollector } from "@/intelligence/collectors/cryptopanic";
import { gdeltCollector } from "@/intelligence/collectors/gdelt";
import { newsdataCollector } from "@/intelligence/collectors/newsdata";
import { newsapiCollector } from "@/intelligence/collectors/newsapi";

// ─── Default Config ──────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ResearchConfig = {
  keywords: [
    // Blockchain & DeFi
    "Ethereum", "Bitcoin", "Solana", "DeFi", "MEV", "Flash Loans", "Layer 2",
    "Rollups", "ZK-Rollups", "Optimistic Rollups", "Arbitrum", "Optimism", "Base",
    "Polygon", "Aave", "Uniswap", "Compound", "MakerDAO", "Curve", "SushiSwap",
    "Liquid Staking", "Restaking", "EigenLayer", "Lido", "Rocket Pool",
    "Tokenization", "RWA", "Stablecoins", "USDC", "USDT", "DAI",
    "NFTs", "ERC-20", "ERC-721", "ERC-1155", "Account Abstraction", "EIP-4337",
    "Bitcoin Ordinals", "BRC-20", "Lightning Network", "Taproot",

    // Smart Contracts & Development
    "Solidity", "Vyper", "Rust", "Move", "Smart Contracts", "EVM",
    "Foundry", "Hardhat", "OpenZeppelin", "Slither", "Mythril",
    "Gas Optimization", "Upgradeable Proxies", "Multisig", "Timelock",
    "Oracle", "Chainlink", "Band Protocol", "The Graph",

    // Cybersecurity
    "Penetration Testing", "Kali Linux", "Parrot OS", "Metasploit",
    "Burp Suite", "Nmap", "Wireshark", "SQL Injection", "XSS",
    "Buffer Overflow", "Privilege Escalation", "Reverse Engineering",
    "Malware Analysis", "Reverse Shell", "Exploit Development",
    "Vulnerability Research", "CVE", "Zero-Day", "Red Team", "Blue Team",
    "Purple Team", "OSINT", "Social Engineering", "Phishing",
    "Incident Response", "Digital Forensics", "Memory Forensics",
    "Network Forensics", "SIEM", "Splunk", "ELK Stack",

    // Linux & Systems
    "Linux", "Kali", "Parrot", "Ubuntu", "Debian", "Arch Linux", "Fedora",
    "RHEL", "Alpine", "Gentoo", "NixOS",
    "Kernel", "Systemd", "Cgroups", "Namespaces", "Seccomp",
    "AppArmor", "SELinux", "Firewall", "iptables", "nftables",
    "SSH", "TLS", "PKI", "Certificates", "OpenSSL",
    "Docker", "Podman", "Kubernetes", "Helm", "Kustomize",
    "Terraform", "Ansible", "Puppet", "Chef",

    // Networking
    "Networking", "DNS", "DoH", "DoT", "BGP", "CDN",
    "Load Balancing", "Reverse Proxy", "Nginx", "Caddy",
    "VPN", "WireGuard", "OpenVPN", "Tor", "I2P",

    // Programming & Development
    "Python", "Rust", "Go", "TypeScript", "JavaScript", "C", "C++",
    "Git", "CI/CD", "GitHub Actions", "Jenkins",
    "PostgreSQL", "Redis", "MongoDB", "SQLite",
    "REST API", "GraphQL", "gRPC", "WebSocket",

    // AI & Machine Learning
    "AI", "Machine Learning", "LLM", "GPT", "Claude", "Gemini",
    "Neural Networks", "Transformers", "RAG", "Fine-Tuning",
    "Stable Diffusion", "Computer Vision", "NLP",

    // Privacy & Crypto
    "Privacy", "Zero Knowledge", "ZKPs", "zk-SNARKs", "zk-STARKs",
    "Ring Signatures", "Monero", "Tornado Cash", "Mixer",
    "End-to-End Encryption", "Signal Protocol", "PGP", "GPG",
    "Tor", "Mixnet", "Anonymous",

    // Cloud & Infrastructure
    "AWS", "GCP", "Azure", "Cloud Security", "Serverless",
    "Infrastructure as Code", "Observability", "Monitoring",
    "Prometheus", "Grafana", "Datadog",

    // DevOps & Tools
    "GitOps", "ArgoCD", "Flux", "Rancher", "K3s", "K0s",
    "Microservices", "Service Mesh", "Istio", "Envoy",
    "Kafka", "RabbitMQ", "NATS",

    // Hardware & IoT
    "Raspberry Pi", "Arduino", "ESP32", "IoT", "Embedded",
    "Hardware Security", "Side-Channel Attacks", "Fault Injection",

    // General Tech
    "Open Source", "FOSS", "Linux Foundation", "CNCF",
    "Programming", "Software Architecture", "System Design",
    "Distributed Systems", "CAP Theorem", "Consensus",
  ],
  maxArticlesPerKeyword: env.researchMaxArticlesPerKeyword,
  maxAgeDays: env.researchMaxAgeDays,
  minSources: env.researchMinSources,
  minImportance: env.researchMinImportance as ResearchConfig["minImportance"],
  categories: ["BLOCKCHAIN", "SECURITY", "LINUX", "SYSTEMS", "PRIVACY", "PROGRAMMING", "NETWORKING", "DEVOPS"],
  difficulties: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
  articlesPerCycle: env.researchArticlesPerCycle,
};

// ─── Research Pipeline ───────────────────────────────────────────────────────

export interface ResearchPipelineResult {
  success: boolean;
  articles: ArticlePlan[];
  research: {
    totalArticles: number;
    totalGroups: number;
    totalAnalyses: number;
    sourcesBreakdown: Record<string, number>;
    keywordsBreakdown: Record<string, number>;
  };
  errors: string[];
}

export async function runResearchPipeline(
  config: Partial<ResearchConfig> = {}
): Promise<ResearchPipelineResult> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];

  console.log("═══ RESEARCH PIPELINE START ═══");

  // ─── Step 1: Collect Raw Research ────────────────────────────────────────
  console.log("\n[1/6] Collecting research from all sources...");
  const rawArticles = await collectResearch(cfg, errors);
  console.log(`  Collected ${rawArticles.length} raw articles`);

  if (rawArticles.length === 0) {
    errors.push("No research articles collected. Pipeline cannot continue.");
    return { success: false, articles: [], research: { totalArticles: 0, totalGroups: 0, totalAnalyses: 0, sourcesBreakdown: {}, keywordsBreakdown: {} }, errors };
  }

  // ─── Step 2: Store Raw Research ──────────────────────────────────────────
  console.log("\n[2/6] Storing raw research...");
  const stored = await storeResearchArticles(rawArticles);
  console.log(`  Stored ${stored} new articles`);

  // ─── Step 3: Deduplicate & Group ─────────────────────────────────────────
  console.log("\n[3/6] Deduplicating and grouping...");
  const groups = deduplicateResearch(rawArticles);
  await storeResearchGroups(groups);
  console.log(`  Grouped into ${groups.length} unique topics`);

  // ─── Step 4: AI Research Analysis ────────────────────────────────────────
  console.log("\n[4/6] AI analyzing research groups...");
  let analyses: ResearchAnalysis[];
  try {
    analyses = await analyzeResearchGroups(groups);
    await storeResearchAnalyses(analyses);
    console.log(`  Analyzed ${analyses.length} research groups`);
  } catch (error) {
    const msg = `Research analysis failed: ${String(error)}`;
    errors.push(msg);
    console.error(`  ${msg}`);
    analyses = groups.map(g => ({
      group: g,
      analysis: {
        whatHappened: g.summary,
        isBreaking: false,
        isImportant: g.importance === "HIGH" || g.importance === "CRITICAL",
        sourceDisagreement: false,
        technicalSignificance: "",
        whyItMatters: "",
        keyEntities: [],
        relatedTopics: [],
      },
      researchNotes: g.keyFacts.join("\n"),
    }));
  }

  // ─── Step 5: Plan Articles ───────────────────────────────────────────────
  console.log("\n[5/6] Planning articles from research...");
  let plans: ArticlePlan[];
  try {
    plans = await planArticles(analyses, cfg);
    console.log(`  Planned ${plans.length} articles`);
  } catch (error) {
    const msg = `Article planning failed: ${String(error)}`;
    errors.push(msg);
    console.error(`  ${msg}`);
    return { success: false, articles: [], research: await getResearchStats(), errors };
  }

  // ─── Step 6: Summary ─────────────────────────────────────────────────────
  console.log("\n[6/6] Pipeline complete.");
  const stats = await getResearchStats();
  console.log(`  Total articles in knowledge base: ${stats.totalArticles}`);
  console.log(`  Total research groups: ${stats.totalGroups}`);
  console.log(`  Total analyses: ${stats.totalAnalyses}`);
  console.log("═══ RESEARCH PIPELINE COMPLETE ═══");

  return {
    success: plans.length > 0,
    articles: plans,
    research: stats,
    errors,
  };
}

// ─── Research Collection ─────────────────────────────────────────────────────

async function collectResearch(
  config: ResearchConfig,
  errors: string[]
): Promise<ResearchArticle[]> {
  const allArticles: ResearchArticle[] = [];

  // Collect from all sources in parallel
  const [cryptoItems, hnItems, cveItems, githubItems, gdeltItems] = await Promise.allSettled([
    collectCryptoNews(config),
    collectHackerNews(config),
    collectCVEResearch(config),
    collectGitHubTrending(config),
    collectGdeltNews(config),
  ]);

  if (cryptoItems.status === "fulfilled") allArticles.push(...cryptoItems.value);
  else errors.push(`Crypto collection failed: ${cryptoItems.reason}`);

  if (hnItems.status === "fulfilled") allArticles.push(...hnItems.value);
  else errors.push(`HackerNews collection failed: ${hnItems.reason}`);

  if (cveItems.status === "fulfilled") allArticles.push(...cveItems.value);
  else errors.push(`CVE collection failed: ${cveItems.reason}`);

  if (githubItems.status === "fulfilled") allArticles.push(...githubItems.value);
  else errors.push(`GitHub collection failed: ${githubItems.reason}`);

  if (gdeltItems.status === "fulfilled") allArticles.push(...gdeltItems.value);
  else errors.push(`GDELT collection failed: ${gdeltItems.reason}`);

  return allArticles;
}

async function collectCryptoNews(config: ResearchConfig): Promise<ResearchArticle[]> {
  const articles: ResearchArticle[] = [];

  const [cpItems, ccItems, cgItems] = await Promise.allSettled([
    cryptopanicCollector.collect(),
    cryptoCollector.collect(),
    coinGeckoCollector.collect(),
  ]);

  if (cpItems.status === "fulfilled") {
    for (const item of cpItems.value) {
      const keyword = findMatchingKeyword(item.title, config.keywords);
      articles.push(normalizeResearchArticle({
        title: item.title,
        summary: item.summary,
        url: item.url,
        publisher: item.source,
        publishedAt: item.publishedAt,
        keyword,
        source: "CRYPTOPANIC",
      }));
    }
  }

  if (ccItems.status === "fulfilled") {
    for (const item of ccItems.value) {
      const keyword = findMatchingKeyword(item.title, config.keywords);
      articles.push(normalizeResearchArticle({
        title: item.title,
        summary: item.summary,
        url: item.url,
        publisher: item.source,
        publishedAt: item.publishedAt,
        keyword,
        source: item.source,
      }));
    }
  }

  if (cgItems.status === "fulfilled") {
    for (const item of cgItems.value) {
      const keyword = findMatchingKeyword(item.title, config.keywords);
      articles.push(normalizeResearchArticle({
        title: item.title,
        summary: item.summary,
        url: item.url,
        publisher: item.source,
        publishedAt: item.publishedAt,
        keyword,
        source: item.source,
      }));
    }
  }

  return articles;
}

async function collectHackerNews(config: ResearchConfig): Promise<ResearchArticle[]> {
  const articles: ResearchArticle[] = [];

  const [hnItems, newsdataItems, newsapiItems] = await Promise.allSettled([
    hackerNewsCollector.collect(),
    newsdataCollector.collect(),
    newsapiCollector.collect(),
  ]);

  if (hnItems.status === "fulfilled") {
    for (const item of hnItems.value) {
      const keyword = findMatchingKeyword(item.title, config.keywords);
      articles.push(normalizeResearchArticle({
        title: item.title,
        summary: item.summary,
        url: item.url,
        publisher: "Hacker News",
        publishedAt: item.publishedAt,
        keyword,
        source: "HACKERNEWS",
      }));
    }
  }

  if (newsdataItems.status === "fulfilled") {
    for (const item of newsdataItems.value) {
      const keyword = findMatchingKeyword(item.title, config.keywords);
      articles.push(normalizeResearchArticle({
        title: item.title,
        summary: item.summary,
        url: item.url,
        publisher: item.source,
        publishedAt: item.publishedAt,
        keyword,
        source: "NEWSDATA",
      }));
    }
  }

  if (newsapiItems.status === "fulfilled") {
    for (const item of newsapiItems.value) {
      const keyword = findMatchingKeyword(item.title, config.keywords);
      articles.push(normalizeResearchArticle({
        title: item.title,
        summary: item.summary,
        url: item.url,
        publisher: item.source,
        publishedAt: item.publishedAt,
        keyword,
        source: "NEWSAPI",
      }));
    }
  }

  return articles;
}

async function collectCVEResearch(config: ResearchConfig): Promise<ResearchArticle[]> {
  const articles: ResearchArticle[] = [];

  try {
    const items = await cveCollector.collect();
    for (const item of items) {
      const keyword = findMatchingKeyword(item.title, config.keywords);
      articles.push(normalizeResearchArticle({
        title: item.title,
        summary: item.summary,
        url: item.url,
        publisher: "NVD / CVE",
        publishedAt: item.publishedAt,
        keyword,
        source: "CVE",
      }));
    }
  } catch (error) {
    console.error("CVE collection failed:", error);
  }

  return articles;
}

async function collectGitHubTrending(config: ResearchConfig): Promise<ResearchArticle[]> {
  const articles: ResearchArticle[] = [];

  try {
    const items = await githubCollector.collect();
    for (const item of items) {
      const keyword = findMatchingKeyword(item.title, config.keywords);
      articles.push(normalizeResearchArticle({
        title: item.title,
        summary: item.summary,
        url: item.url,
        publisher: "GitHub",
        publishedAt: item.publishedAt,
        keyword,
        source: "GITHUB",
      }));
    }
  } catch (error) {
    console.error("GitHub collection failed:", error);
  }

  return articles;
}

async function collectGdeltNews(config: ResearchConfig): Promise<ResearchArticle[]> {
  const articles: ResearchArticle[] = [];

  try {
    const items = await gdeltCollector.collect();
    for (const item of items) {
      const keyword = findMatchingKeyword(item.title, config.keywords);
      articles.push(normalizeResearchArticle({
        title: item.title,
        summary: item.summary,
        url: item.url,
        publisher: item.source,
        publishedAt: item.publishedAt,
        keyword,
        source: "GDELT",
      }));
    }
  } catch (error) {
    console.error("GDELT collection failed:", error);
  }

  return articles;
}

function findMatchingKeyword(title: string, keywords: string[]): string {
  const lower = title.toLowerCase();
  for (const kw of keywords) {
    if (lower.includes(kw.toLowerCase())) return kw;
  }
  return keywords[0] || "TECHNOLOGY";
}
