import { env } from "@/lib/env";
import { generateContent, pipelineDelay } from "@/lib/ai";
import type { ResearchAnalysis, ArticlePlan, ResearchConfig } from "./types";

// ─── Article Planning Engine ─────────────────────────────────────────────────
// Scores research topics and builds an editorial queue.
// Only the highest-scoring topics become articles.

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

export async function planArticles(
  analyses: ResearchAnalysis[],
  config: Partial<ResearchConfig> = {}
): Promise<ArticlePlan[]> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const scored = scoreTopics(analyses, cfg);
  const topTopics = scored.slice(0, cfg.articlesPerCycle * 2);

  await pipelineDelay();
  const plans = await generatePlans(topTopics, cfg);

  return plans.slice(0, cfg.articlesPerCycle);
}

function scoreTopics(
  analyses: ResearchAnalysis[],
  config: ResearchConfig
): ResearchAnalysis[] {
  return analyses
    .filter(a => {
      if (a.group.sourceCount < config.minSources) return false;
      if (importanceRank(a.group.importance) < importanceRank(config.minImportance)) return false;
      return true;
    })
    .map(a => ({
      ...a,
      _score: calculateScore(a),
    }))
    .sort((a, b) => (b as ResearchAnalysis & { _score: number })._score - (a as ResearchAnalysis & { _score: number })._score);
}

function calculateScore(analysis: ResearchAnalysis): number {
  let score = 0;

  const importanceMap = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  score += importanceMap[analysis.group.importance] * 25;

  score += Math.min(analysis.group.sourceCount * 5, 25);

  score += analysis.group.freshnessScore * 20;

  if (analysis.analysis.isBreaking) score += 15;
  if (analysis.analysis.isImportant) score += 10;

  if (analysis.analysis.technicalSignificance.length > 50) score += 10;

  score += Math.abs(analysis.group.averageSentiment) * 5;

  return score;
}

function importanceRank(level: string): number {
  const ranks = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
  return ranks[level as keyof typeof ranks] || 0;
}

async function generatePlans(
  analyses: ResearchAnalysis[],
  config: ResearchConfig
): Promise<ArticlePlan[]> {
  const researchSummaries = analyses
    .map((a, i) => {
      const facts = a.group.articles
        .flatMap(art => art.summary.split(/[.!?]+/).filter(s => s.trim().length > 20))
        .slice(0, 5)
        .join("; ");

      return `${i + 1}. TOPIC: "${a.group.topic}"
   KEYWORD: ${a.group.keyword}
   SOURCES: ${a.group.sources.join(", ")}
   FACTS: ${facts}
   ANALYSIS: ${a.analysis.whatHappened}
   TECHNICAL: ${a.analysis.technicalSignificance}
   IMPORTANCE: ${a.group.importance}`;
    })
    .join("\n\n");

  const prompt = `You are an editorial strategist for a technical publication covering blockchain, cybersecurity, Linux, and systems engineering.

Based on the following verified research analyses, plan ${config.articlesPerCycle} articles.

RESEARCH ANALYSES:
${researchSummaries}

CATEGORIES: ${config.categories.join(", ")}
DIFFICULTIES: ${config.difficulties.join(", ")}

Respond ONLY with valid JSON (no markdown fences):

{
  "articles": [
    {
      "slug": "kebab-case-slug",
      "title": "Short, declarative title (under 60 chars)",
      "subtitle": "One sentence explaining what the reader gains",
      "category": "CATEGORY",
      "difficulty": "LEVEL",
      "readTime": "XX MIN",
      "xp": 300,
      "excerpt": "2-3 sentence hook referencing the specific research",
      "tags": ["CATEGORY", "TOPIC"],
      "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
      "researchIndex": 0
    }
  ]
}

Rules:
- Each article must map to exactly one research analysis (use researchIndex)
- Titles must be declarative, not questions
- Excerpts must reference specific facts from the research, not generic statements
- readTime should be proportional to complexity (BEGINNER=10-12, INTERMEDIATE=12-15, ADVANCED=14-18)
- xp should scale with difficulty (BEGINNER=200-250, INTERMEDIATE=250-320, ADVANCED=320-400)
- Tags must include the category plus relevant topic tags
- Keywords should be specific terms from the research`;

  const text = await generateContent(prompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse article plans from Gemini");

  const parsed = JSON.parse(jsonMatch[0].replace(/[\x00-\x1f\x7f]/g, " "));
  if (!Array.isArray(parsed.articles)) throw new Error("Invalid plan format");

  return parsed.articles.map((plan: Record<string, unknown>, index: number) => {
    const analysis = analyses[Number(plan.researchIndex) || index];
    return {
      slug: String(plan.slug || ""),
      title: String(plan.title || ""),
      subtitle: String(plan.subtitle || ""),
      category: String(plan.category || "TECHNOLOGY"),
      difficulty: String(plan.difficulty || "INTERMEDIATE"),
      readTime: String(plan.readTime || "12 MIN"),
      xp: Number(plan.xp) || 250,
      excerpt: String(plan.excerpt || ""),
      tags: Array.isArray(plan.tags) ? plan.tags : [],
      keywords: Array.isArray(plan.keywords) ? plan.keywords : [],
      researchPackage: {
        analysis: analysis ? [analysis] : [],
        sources: analysis ? analysis.group.sources : [],
        facts: analysis ? analysis.group.keyFacts : [],
        citations: analysis
          ? analysis.group.articles.map(a => ({
              title: a.title,
              url: a.url,
              publisher: a.publisher,
            }))
          : [],
      },
    };
  });
}
