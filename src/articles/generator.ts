import { env } from "@/lib/env";
import { generateContent, pipelineDelay } from "@/lib/ai";
import { runResearchPipeline, getRecentGroups, getResearchStats } from "@/research";
import type { ArticlePlan, ResearchConfig } from "@/research/types";
import { storeGeneratedArticle } from "@/lib/generated-articles";
import { readFileSync } from "fs";
import { join } from "path";

// ─── Writer Agent Instructions ───────────────────────────────────────────────
// Loaded from CLAUDE.md at module init. Injected into every generation prompt.

let AGENT_INSTRUCTIONS = "";
try {
  AGENT_INSTRUCTIONS = readFileSync(join(process.cwd(), "CLAUDE.md"), "utf8");
} catch {
  AGENT_INSTRUCTIONS = "You are a senior technical writer. Write deeply technical, well-researched articles.";
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface GeneratorConfig extends Partial<ResearchConfig> {}

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
  articlesPerCycle: 4,
};

// ─── Word Count Utilities ────────────────────────────────────────────────────

function countWords(html: string): number {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

function truncateToWordCount(html: string, target: number): string {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= target) return html;

  let charCount = 0;
  for (let i = 0; i < target && i < words.length; i++) {
    charCount += words[i].length + 1;
  }

  let result = html.slice(0, charCount).trimEnd();

  const openTags = result.match(/<(?!\/)(?!br|hr|img|input|meta|link)([a-z]+)[^>]*>/gi);
  if (openTags) {
    for (const tag of openTags) {
      const tagName = tag.match(/<([a-z]+)/)?.[1];
      if (tagName && !result.includes(`</${tagName}>`)) {
        result += `</${tagName}>`;
      }
    }
  }

  return result;
}

// ─── Article Generation ──────────────────────────────────────────────────────

export interface GeneratedArticleBody {
  intro: string;
  deepDive: string;
  principles: string[];
  examples: Array<{ title: string; body: string }>;
  antiPatterns: string[];
  checklist: string[];
  move: string;
}

export async function generateArticleBody(
  plan: ArticlePlan,
  wordCount: number = 1200,
  tolerance: number = 15
): Promise<GeneratedArticleBody> {
  const citations = plan.researchPackage.citations
    .slice(0, 10)
    .map((c, i) => `${i + 1}. [${c.publisher}] "${c.title}" — ${c.url}`)
    .join("\n");

  const facts = plan.researchPackage.facts
    .slice(0, 10)
    .map((f, i) => `${i + 1}. ${f}`)
    .join("\n");

  const analyses = plan.researchPackage.analysis
    .map(a => a.analysis)
    .filter(Boolean);

  const analysisContext = analyses.length > 0
    ? `\n\nRESEARCH ANALYSIS:\n${analyses.map(a => `
What happened: ${a.whatHappened}
Technical significance: ${a.technicalSignificance}
Why it matters: ${a.whyItMatters}
Key entities: ${a.keyEntities.join(", ")}
Breaking: ${a.isBreaking}
Important: ${a.isImportant}
`).join("\n")}`
    : "";

  const prompt = `${AGENT_INSTRUCTIONS}

Write a complete article based on the following research. Follow the structure and voice guidelines above exactly.

ARTICLE PLAN:
Title: ${plan.title}
Subtitle: ${plan.subtitle}
Category: ${plan.category}
Difficulty: ${plan.difficulty}
Tags: ${plan.tags.join(", ")}
Keywords: ${plan.keywords.join(", ")}
Excerpt: ${plan.excerpt}

VERIFIED RESEARCH FACTS:
${facts}

SOURCES (cite these in LIVE SIGNALS):
${citations}
${analysisContext}

Return ONLY valid JSON, no markdown fences:

{
  "intro": "<p>First paragraph...</p><p>Second paragraph...</p>",
  "deepDive": "<h3>Subsection title</h3><p>Content...</p><pre><code>// Code example if appropriate</code></pre>",
  "principles": ["Principle 1 — clear, actionable, specific", "Principle 2", "Principle 3", "Principle 4", "Principle 5"],
  "examples": [{"title": "Example Title", "body": "Concrete walkthrough of a real scenario"}],
  "antiPatterns": ["Anti-pattern 1 — what not to do and why", "Anti-pattern 2", "Anti-pattern 3", "Anti-pattern 4"],
  "checklist": ["Action item 1", "Action item 2", "Action item 3", "Action item 4", "Action item 5"],
  "move": "One concrete next step the reader should take immediately"
}

${plan.affiliateContext?.editorialGuidance ? `\n${plan.affiliateContext.editorialGuidance}\n` : ""}
CRITICAL RULES:
1. The "intro" field MUST be exactly ${wordCount} words (between ${wordCount - tolerance} and ${wordCount + tolerance}). Count carefully.
2. Write in a direct, authoritative, technical voice. No fluff, no filler.
3. Each paragraph in intro should be 100-200 words. Aim for 6-8 paragraphs.
4. Use concrete examples, specific numbers, real tools and protocols from the research.
5. The deepDive should be 400-600 words with 2-3 subsections, including at least one code block if the topic allows.
6. Principles should be 5 items, each under 30 words.
7. Examples should be 1-2 concrete scenarios, 80-120 words each.
8. AntiPatterns should be 4 items describing specific mistakes and consequences.
9. Checklist should be 5 actionable items.
10. Move should be one specific, immediately actionable step.
11. Reference the research facts and sources — cite publisher names.
12. Use HTML tags: <p>, <h3>, <pre><code>, <strong>, <em>, <ul>, <li>, <a>.
13. Do NOT include <h2> tags — those are added by the layout system.
14. Write as if the reader is a practicing engineer.
15. Every claim must be grounded in the provided research or established technical fact.
16. NO section should repeat information from another section. Each section must add NEW value.
17. Include at least one real code snippet or command in the deepDive.
18. The deepDive should include a mermaid chart showing architecture, flow, or relationships.`;

  const genText = await generateContent(prompt);

  const jsonMatch = genText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse article content from AI");

  const cleaned = jsonMatch[0].replace(/[\x00-\x1f\x7f]/g, " ");
  const parsed = JSON.parse(cleaned);

  let intro = parsed.intro || "";
  const introWords = countWords(intro);
  if (introWords < wordCount - tolerance * 2 || introWords > wordCount + tolerance * 2) {
    console.log(`  Intro was ${introWords} words, refining to hit ${wordCount}±${tolerance}...`);
    const refinePrompt = `Rewrite this intro to be exactly ${wordCount} words (between ${wordCount - tolerance} and ${wordCount + tolerance}). Keep the same topic, tone, and structure. Return ONLY the HTML paragraphs.

Current intro (${introWords} words):
${intro}

TOPIC: ${plan.title}
EXCERPT: ${plan.excerpt}

Count every word carefully.`;

    const refinedText = await generateContent(refinePrompt);
    const cleaned = refinedText.replace(/^```html\n?/, "").replace(/\n?```$/, "").trim();
    if (cleaned.startsWith("<p>")) {
      intro = cleaned;
    }
    const newCount = countWords(intro);
    console.log(`  Refined intro: ${newCount} words`);
    if (newCount < wordCount - tolerance * 3 || newCount > wordCount + tolerance * 3) {
      intro = truncateToWordCount(intro, wordCount);
      console.log(`  Truncated to ${countWords(intro)} words`);
    }
  }

  return {
    intro,
    deepDive: parsed.deepDive || "",
    principles: Array.isArray(parsed.principles) ? parsed.principles : [],
    examples: Array.isArray(parsed.examples) ? parsed.examples : [],
    antiPatterns: Array.isArray(parsed.antiPatterns) ? parsed.antiPatterns : [],
    checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [],
    move: parsed.move || "",
  };
}

// ─── Deep Dive Expansion & Polish ────────────────────────────────────────────

async function expandDeepDive(
  plan: ArticlePlan,
  content: GeneratedArticleBody
): Promise<GeneratedArticleBody> {
  const prompt = `You are a senior technical editor. Expand and polish this article's deep dive section.

TOPIC: ${plan.title}
CATEGORY: ${plan.category}

CURRENT DEEP DIVE:
${content.deepDive}

CURRENT EXAMPLES:
${content.examples.map(e => e.title + ": " + e.body).join("\n")}

CURRENT ANTI-PATTERNS:
${content.antiPatterns.join("\n")}

TASKS:
1. Expand the deep dive to 600-800 words with 3-4 subsections
2. Add at least one real code block (command line, config, or code snippet) in <pre><code> tags
3. Add a mermaid chart showing the architecture, flow, or relationships described (use \`\`\`mermaid blocks)
4. Make sure the deep dive does NOT repeat information from the intro
5. Make sure examples don't repeat the deep dive content
6. Make sure anti-patterns don't overlap with principles
7. Each section must add NEW information, not restate what came before

Return ONLY valid JSON:
{
  "deepDive": "expanded HTML with h3 subsections, pre/code blocks, and mermaid chart",
  "examples": [{"title": "...", "body": "..."}],
  "antiPatterns": ["..."]
}

RULES:
- No <h2> tags — those are added by layout
- Use <h3> for subsections
- Include at least one <pre><code> block with real commands or code
- Include one \`\`\`mermaid chart block
- No repetition between sections
- Write as a practitioner, not a textbook`;

  try {
    const text = await generateContent(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return content;

    const cleaned = jsonMatch[0].replace(/[\x00-\x1f\x7f]/g, " ");
    const parsed = JSON.parse(cleaned);
    return {
      ...content,
      deepDive: parsed.deepDive || content.deepDive,
      examples: Array.isArray(parsed.examples) && parsed.examples.length > 0 ? parsed.examples : content.examples,
      antiPatterns: Array.isArray(parsed.antiPatterns) && parsed.antiPatterns.length > 0 ? parsed.antiPatterns : content.antiPatterns,
    };
  } catch (error) {
    console.log(`  Deep dive expansion failed: ${String(error)}, using original`);
    return content;
  }
}

// ─── Article Body Rendering ──────────────────────────────────────────────────

export function renderArticleBody(
  plan: ArticlePlan,
  content: GeneratedArticleBody
): string {
  const sections: string[] = [];

  sections.push(content.intro);

  sections.push(`<h2>THE DEEP DIVE</h2>`);
  sections.push(content.deepDive);

  if (content.principles.length > 0) {
    sections.push(`<h2>PRINCIPLES</h2>`);
    sections.push(`<ol>`);
    for (const p of content.principles) {
      sections.push(`<li><strong>${p}</strong></li>`);
    }
    sections.push(`</ol>`);
  }

  if (content.examples.length > 0) {
    sections.push(`<h2>IN PRACTICE</h2>`);
    for (const ex of content.examples) {
      sections.push(`<h3>${ex.title}</h3>`);
      sections.push(`<p>${ex.body}</p>`);
    }
  }

  sections.push(`<h2>LIVE SIGNALS</h2>`);
  if (plan.researchPackage.citations.length > 0) {
    sections.push(`<p>These items surfaced from the intelligence pipeline at generation time.</p>`);
    sections.push(`<ul>`);
    for (const citation of plan.researchPackage.citations.slice(0, 5)) {
      sections.push(`<li><a href="${citation.url}" target="_blank">${citation.title}</a> — ${citation.publisher}</li>`);
    }
    sections.push(`</ul>`);
  } else {
    sections.push(`<p>Sources monitored in real time. No breaking events at time of writing.</p>`);
  }

  if (content.antiPatterns.length > 0) {
    sections.push(`<h2>ANTIPATTERNS</h2>`);
    sections.push(`<ul>`);
    for (const ap of content.antiPatterns) {
      sections.push(`<li>${ap}</li>`);
    }
    sections.push(`</ul>`);
  }

  if (content.checklist.length > 0) {
    sections.push(`<h2>CHECKLIST</h2>`);
    sections.push(`<ul>`);
    for (const c of content.checklist) {
      sections.push(`<li>${c}</li>`);
    }
    sections.push(`</ul>`);
  }

  if (content.move) {
    sections.push(`<h2>YOUR MOVE</h2>`);
    sections.push(`<p>${content.move}</p>`);
  }

  return sections.join("\n");
}

// ─── Generated Article Storage ───────────────────────────────────────────────

export interface GeneratedArticle {
  slug: string;
  title: string;
  subtitle: string;
  category: string;
  difficulty: string;
  readTime: string;
  xp: number;
  excerpt: string;
  tags: string[];
  body: string;
  generatedAt: string;
  publishAt: string;
  researchSources: string[];
}

// ─── Single Article Generation (Cron) ────────────────────────────────────────

export async function generateSingleArticle(
  config: GeneratorConfig = {}
): Promise<{
  success: boolean;
  article: GeneratedArticle | null;
  errors: string[];
  researchCount: number;
}> {
  const errors: string[] = [];

  console.log("═══ SINGLE ARTICLE GENERATION ═══");

  // ─── Step 1: Run Research Pipeline (1 article) ──────────────────────────
  console.log("\n[1/3] Running research pipeline...");
  const pipelineConfig: Partial<ResearchConfig> = {
    ...config,
    articlesPerCycle: 1,
  };

  let pipelineResult;
  try {
    pipelineResult = await runResearchPipeline(pipelineConfig);
    errors.push(...pipelineResult.errors);
  } catch (error) {
    errors.push(`Research pipeline failed: ${String(error)}`);
    return { success: false, article: null, errors, researchCount: 0 };
  }

  if (!pipelineResult.success || pipelineResult.articles.length === 0) {
    errors.push("Research pipeline produced no article plans.");
    return { success: false, article: null, errors, researchCount: pipelineResult.research.totalArticles };
  }

  const plan = pipelineResult.articles[0];
  console.log(`  Selected: ${plan.title}`);

  // ─── Step 2: Generate Article ───────────────────────────────────────────
  console.log("\n[2/3] Generating article...");
  let article: GeneratedArticle;
  try {
    const rawContent = await generateArticleBody(plan);
    await pipelineDelay();
    const content = await expandDeepDive(plan, rawContent);
    await pipelineDelay();
    const body = renderArticleBody(plan, content);

    const publishAt = new Date();
    publishAt.setDate(publishAt.getDate() + 1);
    publishAt.setHours(9, 0, 0, 0);

    article = {
      slug: plan.slug,
      title: plan.title,
      subtitle: plan.subtitle,
      category: plan.category,
      difficulty: plan.difficulty,
      readTime: plan.readTime,
      xp: plan.xp,
      excerpt: plan.excerpt,
      tags: plan.tags,
      body,
      generatedAt: new Date().toISOString(),
      publishAt: publishAt.toISOString(),
      researchSources: plan.researchPackage.citations.map(c => c.url),
    };
    console.log(`  ✓ Generated: ${plan.title}`);
  } catch (error) {
    errors.push(`Failed to generate "${plan.title}": ${String(error)}`);
    console.error(`  ✗ Failed: ${plan.title} — ${String(error)}`);
    return { success: false, article: null, errors, researchCount: pipelineResult.research.totalArticles };
  }

  // ─── Step 3: Store Article ──────────────────────────────────────────────
  console.log("\n[3/3] Storing article...");
  const ok = await storeGeneratedArticle({
    slug: article.slug,
    title: article.title,
    category: article.category,
    difficulty: article.difficulty,
    read_time: article.readTime,
    xp: article.xp,
    excerpt: article.excerpt,
    body: article.body,
    tags: article.tags,
  }, article.publishAt);

  if (ok) console.log(`  ✓ Stored: ${article.slug}`);
  else errors.push(`Failed to store article: ${article.slug}`);

  console.log("\n═══ GENERATION COMPLETE ═══");
  return {
    success: ok,
    article: ok ? article : null,
    errors,
    researchCount: pipelineResult.research.totalArticles,
  };
}

// ─── Batch Generation (Manual) ──────────────────────────────────────────────

export async function generateFourArticles(
  config: GeneratorConfig = {}
): Promise<{
  success: boolean;
  articles: GeneratedArticle[];
  errors: string[];
  researchCount: number;
}> {
  const errors: string[] = [];

  console.log("═══ ARTICLE GENERATION PIPELINE ═══");

  // ─── Step 1: Run Research Pipeline ─────────────────────────────────────
  console.log("\n[1/3] Running research pipeline...");
  const pipelineConfig: Partial<ResearchConfig> = {
    ...config,
    articlesPerCycle: 4,
  };

  let pipelineResult;
  try {
    pipelineResult = await runResearchPipeline(pipelineConfig);
    errors.push(...pipelineResult.errors);
  } catch (error) {
    errors.push(`Research pipeline failed: ${String(error)}`);
    return { success: false, articles: [], errors, researchCount: 0 };
  }

  if (!pipelineResult.success || pipelineResult.articles.length === 0) {
    errors.push("Research pipeline produced no article plans.");
    return { success: false, articles: [], errors, researchCount: pipelineResult.research.totalArticles };
  }

  console.log(`  Research produced ${pipelineResult.articles.length} article plans`);

  // ─── Step 2: Generate Articles from Plans ──────────────────────────────
  console.log("\n[2/3] Generating articles from research plans...");
  const articles: GeneratedArticle[] = [];
  const now = new Date();

  for (let i = 0; i < pipelineResult.articles.length; i++) {
    const plan = pipelineResult.articles[i];
    try {
      console.log(`\n  Generating: ${plan.title}`);
      const rawContent = await generateArticleBody(plan);
      await pipelineDelay();
      const content = await expandDeepDive(plan, rawContent);
      await pipelineDelay();
      const body = renderArticleBody(plan, content);

      const publishAt = new Date(now);
      publishAt.setDate(publishAt.getDate() + i);
      publishAt.setHours(9, 0, 0, 0);

      const article: GeneratedArticle = {
        slug: plan.slug,
        title: plan.title,
        subtitle: plan.subtitle,
        category: plan.category,
        difficulty: plan.difficulty,
        readTime: plan.readTime,
        xp: plan.xp,
        excerpt: plan.excerpt,
        tags: plan.tags,
        body,
        generatedAt: now.toISOString(),
        publishAt: publishAt.toISOString(),
        researchSources: plan.researchPackage.citations.map(c => c.url),
      };

      articles.push(article);
      console.log(`  ✓ Generated: ${plan.title}`);
    } catch (error) {
      errors.push(`Failed to generate "${plan.title}": ${String(error)}`);
      console.error(`  ✗ Failed: ${plan.title} — ${String(error)}`);
    }
  }

  // ─── Step 3: Store Generated Articles ──────────────────────────────────
  console.log("\n[3/3] Storing generated articles...");
  if (articles.length > 0) {
    let stored = 0;
    for (const article of articles) {
      const ok = await storeGeneratedArticle({
        slug: article.slug,
        title: article.title,
        category: article.category,
        difficulty: article.difficulty,
        read_time: article.readTime,
        xp: article.xp,
        excerpt: article.excerpt,
        body: article.body,
        tags: article.tags,
      }, article.publishAt);
      if (ok) stored++;
    }
    console.log(`  Stored ${stored}/${articles.length} articles`);
  }

  console.log("\n═══ GENERATION COMPLETE ═══");
  return {
    success: articles.length > 0,
    articles,
    errors,
    researchCount: pipelineResult.research.totalArticles,
  };
}

export async function generateArticleBySlug(slug: string): Promise<{ success: boolean; error?: string }> {
  const { getGeneratedArticle } = await import("@/lib/generated-articles");

  const existing = await getGeneratedArticle(slug);
  if (!existing) {
    return { success: false, error: `Article with slug "${slug}" not found in database` };
  }

  try {
    console.log(`Running research pipeline for: ${existing.title}`);

    const pipelineResult = await runResearchPipeline({
      keywords: existing.tags || [],
      articlesPerCycle: 1,
    });

    if (!pipelineResult.success || pipelineResult.articles.length === 0) {
      return { success: false, error: "Research pipeline produced no results for this article" };
    }

    const plan = pipelineResult.articles[0];
    const rawContent = await generateArticleBody(plan);
    await pipelineDelay();
    const content = await expandDeepDive(plan, rawContent);
    await pipelineDelay();
    const body = renderArticleBody(plan, content);

    await storeGeneratedArticle({
      slug: existing.slug,
      title: existing.title,
      category: existing.category,
      difficulty: existing.difficulty,
      read_time: existing.read_time,
      xp: existing.xp,
      excerpt: existing.excerpt,
      body,
      tags: existing.tags,
    }, existing.published_at || new Date().toISOString());

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export const generateAllArticles = generateFourArticles;
