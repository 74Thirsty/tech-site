import { readFile } from "fs/promises";
import { join } from "path";
import { generateContent, pipelineDelay } from "@/lib/ai";
import { searchPexels, type PexelsImage } from "@/lib/pexels";
import { runIntelligence } from "@/intelligence/pipeline";
import { githubCollector } from "@/intelligence/collectors/github";
import { hackerNewsCollector } from "@/intelligence/collectors/hackernews";
import { cveCollector } from "@/intelligence/collectors/cve";
import { cryptoCollector, coinGeckoCollector } from "@/intelligence/collectors/crypto";
import { cryptopanicCollector } from "@/intelligence/collectors/cryptopanic";
import { gdeltCollector } from "@/intelligence/collectors/gdelt";
import { newsdataCollector } from "@/intelligence/collectors/newsdata";
import { newsapiCollector } from "@/intelligence/collectors/newsapi";

export type NewsletterGuide = {
  id: string;
  subject: string;
  subtitle: string;
  issueNumber: number;
  publishDate: string;
  estimatedReadTime: string;
  difficulty: string;
  learningObjectives: string[];
  tableOfContents: string[];
  prerequisites: string[];
  requiredTools: string[];
  mainGuide: string;
  summary: string;
  furtherReading: string[];
  status: "DRAFT" | "NEEDS_REVIEW" | "APPROVED" | "SENT";
  topics: string[];
  generatedAt: string;
    review: string;
    reviewProduct: string;
    reviewVerdict: string;
    reviewScore: number;
    reviewImage: string;
    reviewSpecs: Record<string, string>;
    heroImage: { url: string; photographer: string; alt: string } | null;
    sectionImages: { url: string; photographer: string; alt: string; placement: string }[];
    researchItems: { title: string; url: string; source: string; summary: string; topics: string[]; publishedAt: string }[];
};

let cachedNewsletterAgent = "";
let cachedReviewAgent = "";

async function getNewsletterAgent(): Promise<string> {
  if (cachedNewsletterAgent) return cachedNewsletterAgent;
  try {
    cachedNewsletterAgent = await readFile(join(process.cwd(), "NEWSLETTER.md"), "utf-8");
  } catch {
    cachedNewsletterAgent = "You are an elite technical instructor. Write a complete, step-by-step how-to manual.";
  }
  return cachedNewsletterAgent;
}

async function getReviewAgent(): Promise<string> {
  if (cachedReviewAgent) return cachedReviewAgent;
  try {
    cachedReviewAgent = await readFile(join(process.cwd(), "REVIEW.md"), "utf-8");
  } catch {
    cachedReviewAgent = "You are an elite product reviewer. Write a comprehensive, unbiased product review.";
  }
  return cachedReviewAgent;
}

export async function generatePremiumGuide(): Promise<NewsletterGuide> {
  console.log("Running research pipeline for newsletter guide...");

  const [newsletterAgent, reviewAgent] = await Promise.all([getNewsletterAgent(), getReviewAgent()]);

  const research = await runIntelligence([
    githubCollector,
    hackerNewsCollector,
    cveCollector,
    cryptoCollector,
    coinGeckoCollector,
    cryptopanicCollector,
    gdeltCollector,
    newsdataCollector,
    newsapiCollector,
  ]);

  const topItems = research.items
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 20);

  const researchContext = topItems.length > 0
    ? `\n\nCURRENT LIVE RESEARCH DATA:\n${topItems.map((item, i) => `${i + 1}. [${item.source}] ${item.title} — ${item.summary} (topics: ${item.topics.join(", ")}, priority: ${item.priority.toFixed(2)})`).join("\n")}`
    : "\n\nNo current research available. Generate based on established technical knowledge.";

  const prompt = `You are creating the definitive premium newsletter for engineers, hackers, and builders. This newsletter has TWO sections: a DIY PROJECT and a PRODUCT REVIEW. Both must be world-class, publication-grade content.

--- SECTION 1: THE DIY PROJECT ---

${newsletterAgent}

CLASSIFY the project into one of these modes based on what would be most valuable given current research:
- MODE A: Technical Build (computers, servers, networks, software, hardware)
- MODE B: DIY Project (building, modifying, installing, repairing, configuring)
- MODE C: Skill Training (learning techniques, workflows, professional skills)
- MODE D: Strategy Guide (games, optimization, tactics, decision making)
- MODE E: Troubleshooting (diagnosing problems, repairing failures, debugging)
- MODE F: Research / Analysis (investigation methods, comparisons, analysis workflows)

Pick a project that is:
1. Immediately useful — the reader can start today and finish today
2. Non-trivial — not a "hello world" or "install npm" tutorial
3. Rooted in real tooling — actual commands, actual configs, actual hardware
4. Something an experienced engineer would bookmark

${researchContext}

--- SECTION 2: THE PRODUCT REVIEW ---

${reviewAgent}

CLASSIFY the product into one of these modes:
- MODE A: Technology Review (computers, phones, routers, servers, hardware, software)
- MODE B: Consumer Product Review (appliances, tools, vehicles, household)
- MODE C: Professional Equipment Review (developer tools, networking, cameras, industrial)
- MODE D: Subscription / Service Review (SaaS, cloud services, apps, memberships)

Pick a product that is:
1. Actually real — do not invent products, names, or specifications
2. Relevant to the research signals — tie it to current events or trends
3. Something engineers would genuinely consider buying
4. Not generic — be specific about model numbers, SKUs, configurations

--- OUTPUT FORMAT ---

Respond ONLY with valid JSON (no markdown fences) in this exact format:
{
  "title": "Newsletter title — something punchy and specific, not generic",
  "subtitle": "One sentence hook that makes the reader want to open this",
  "difficulty": "INTERMEDIATE",
  "estimatedReadTime": "45 MIN",
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3", "Objective 4", "Objective 5"],
  "prerequisites": ["Prerequisite 1", "Prerequisite 2", "Prerequisite 3"],
  "requiredTools": ["Tool 1", "Tool 2", "Tool 3"],
  "topics": ["TOPIC1", "TOPIC2", "TOPIC3"],
  "tableOfContents": ["Section 1", "Section 2", "Section 3", "Section 4", "Section 5"],
  "mainGuide": "<h2>PROJECT: [Project Name]</h2><p>...</p><h2>REVIEW: [Product Name]</h2><p>...</p>",
  "summary": "2-3 sentence summary of what this issue covers and why it matters",
  "furtherReading": ["Resource 1 with URL", "Resource 2 with URL"],
  "heroImage": "Pexels search query for the newsletter hero — e.g. 'server room dark' or 'hacking code screen' or 'network cables'",
  "sectionImages": [
    { "query": "search query for section 1", "placement": "after-intro" },
    { "query": "search query for section 2", "placement": "after-step-3" },
    { "query": "search query for section 3", "placement": "before-review" }
  ],
  "reviewImage": "Exact Pexels search query for the product image — e.g. 'MacBook Pro laptop' or 'Mechanical keyboard RGB' or 'Raspberry Pi 5'",
  "reviewSpecs": {
    "Category": "Hardware / Software / etc.",
    "Price": "$XXX",
    "Key Spec 1": "Value",
    "Key Spec 2": "Value",
    "Key Spec 3": "Value",
    "Key Spec 4": "Value",
    "Key Spec 5": "Value"
  },
  "review": "Full HTML review following the REVIEW.md structure — Product Overview, Quick Verdict, Specs, Real-World Performance, Setup, Feature Analysis, Strengths, Weaknesses, Ownership Experience, Competitor Comparison, Hidden Costs, Who Should Buy, Alternatives, Final Recommendation",
  "reviewProduct": "Product name exactly as manufactured markets it",
  "reviewVerdict": "One of: BUY / BUY WITH CONDITIONS / WAIT / AVOID",
  "reviewScore": 8
}

--- RULES ---

THE DIY PROJECT (mainGuide first half):
1. Follow the NEWSLETTER.md structure EXACTLY — Mission Objective, Difficulty Rating, Requirements, Background, System Overview, Preparation, Step-by-Step (Goal / Required Items / Action / Explanation / Verification / Troubleshooting for each step), Configuration, Real-World Examples, Expert Techniques, Variations, Troubleshooting Encyclopedia, Recovery, Security, Maintenance, Completion Checklist, Quick Reference
2. Minimum 3000 words of HTML for the DIY section alone
3. Every step must have EXACT commands, EXACT configurations, EXACT paths — not pseudocode
4. Include real code blocks with actual syntax highlighting
5. Include a mermaid diagram for the system/process overview
6. Every step must have Verification and Troubleshooting subsections
7. End with a Completion Checklist and Quick Reference Cheat Sheet
8. Write for someone who has NEVER done this before but wants to learn properly
9. CONVERSATIONAL VOICE: Write as if an experienced instructor is personally teaching the reader. Every step must answer: What are we doing? Why? How? What should happen? What if something goes wrong?
10. NO INFORMATION DUMBS: Never produce giant walls of bullets, disconnected facts, or collections of commands without explanation. Integrate information into a learning flow.
11. EXPLANATION BEFORE ACTION: Never present an instruction without context. Explain what the command does before showing it. Describe what the reader should see after running it.
12. STEP FORMAT: Every major procedure must follow the format from NEWSLETTER.md — Goal, Required Items, Action, Explanation, Verification, Troubleshooting. The reader must feel guided, not handed a checklist.

THE PRODUCT REVIEW (mainGuide second half):
1. Follow the REVIEW.md structure EXACTLY — Product Overview, Quick Verdict, Specifications, Real-World Performance, Setup, Feature Analysis, Strengths, Weaknesses, Ownership Experience, User Feedback, Competitor Comparison, Hidden Costs, Who Should Buy, Alternatives, Final Recommendation
2. Minimum 2000 words of HTML for the review section alone
3. Include a competitor comparison TABLE using HTML <table>
4. Include score breakdown: Performance / Value / Quality / Ease of use / Longevity (each X/10)
5. Be brutally honest — call out weaknesses, hidden costs, and marketing vs reality
6. Do NOT use phrases like "best product ever" — instead explain "best for this specific person because..."
7. Reference real prices, real specifications, real model numbers

GENERAL RULES:
1. The mainGuide field must contain BOTH sections — DIY project first, then review
2. Separate the two sections with a clear visual break: <hr style="border:1px solid var(--line);margin:60px 0">
3. Total mainGuide content: minimum 5000 words of HTML
4. Use HTML tags: <h2>, <h3>, <h4>, <p>, <pre><code>, <strong>, <em>, <ul>, <li>, <a>, <blockquote>, <table>, <tr>, <td>, <th>, <hr>, <div>
5. Every claim must be grounded in real technical facts
6. Do not fabricate tools, versions, products, specifications, or prices
7. Reference the research signals where relevant — cite real recent events in both sections
8. The review MUST be about a real, specific, purchasable product with real specs
9. The DIY project MUST be something the reader can actually complete today
10. This must read like content from a premium paid newsletter — not a blog post, not a tutorial site, not a product listing
11. CONVERSATIONAL INSTRUCTION: Write as if an expert instructor is personally walking the reader through the process. Never dump information. Explain before acting. Guide through every step. The reader must feel taught, not documented.`;

  const text = await generateContent(prompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse newsletter content from AI");

  const cleaned = jsonMatch[0].replace(/[\x00-\x1f\x7f]/g, " ");
  const parsed = JSON.parse(cleaned);

  const now = new Date();
  const issueNumber = Math.floor((now.getTime() - new Date("2025-01-01").getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  const sectionImages = Array.isArray(parsed.sectionImages) ? parsed.sectionImages : [];

  let heroImageUrl: { url: string; photographer: string; alt: string } | null = null;
  const fetchedImages: { url: string; photographer: string; alt: string; placement: string }[] = [];

  try {
    const heroResults = await searchPexels(parsed.heroImage || "technology dark server", 1);
    if (heroResults.length > 0) {
      heroImageUrl = { url: heroResults[0].url, photographer: heroResults[0].photographer, alt: heroResults[0].alt };
    }
  } catch { /* best-effort */ }

  for (const img of sectionImages.slice(0, 4)) {
    try {
      const results = await searchPexels(img.query, 1);
      if (results.length > 0) {
        fetchedImages.push({ url: results[0].url, photographer: results[0].photographer, alt: results[0].alt, placement: img.placement });
      }
    } catch { /* skip on failure */ }
  }

  let reviewImageUrl = "";
  try {
    const reviewResults = await searchPexels(parsed.reviewImage || parsed.reviewProduct || "technology", 1);
    if (reviewResults.length > 0) {
      reviewImageUrl = reviewResults[0].url;
    }
  } catch { /* best-effort */ }

  return {
    id: `guide-${now.toISOString().slice(0, 10)}`,
    subject: parsed.title || "Technical Guide",
    subtitle: parsed.subtitle || "",
    issueNumber,
    publishDate: now.toISOString().slice(0, 10),
    estimatedReadTime: parsed.estimatedReadTime || "45 MIN",
    difficulty: parsed.difficulty || "INTERMEDIATE",
    learningObjectives: Array.isArray(parsed.learningObjectives) ? parsed.learningObjectives : [],
    tableOfContents: Array.isArray(parsed.tableOfContents) ? parsed.tableOfContents : [],
    prerequisites: Array.isArray(parsed.prerequisites) ? parsed.prerequisites : [],
    requiredTools: Array.isArray(parsed.requiredTools) ? parsed.requiredTools : [],
    mainGuide: parsed.mainGuide || "",
    summary: parsed.summary || "",
    furtherReading: Array.isArray(parsed.furtherReading) ? parsed.furtherReading : [],
    status: "DRAFT",
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    generatedAt: now.toISOString(),
    review: parsed.review || "",
    reviewProduct: parsed.reviewProduct || "",
    reviewVerdict: parsed.reviewVerdict || "WAIT",
    reviewScore: typeof parsed.reviewScore === "number" ? parsed.reviewScore : 0,
    reviewImage: reviewImageUrl || parsed.reviewImage || "",
    reviewSpecs: parsed.reviewSpecs && typeof parsed.reviewSpecs === "object" ? parsed.reviewSpecs : {},
    heroImage: heroImageUrl,
    sectionImages: fetchedImages,
    researchItems: topItems.map(item => ({
      title: item.title,
      url: item.url,
      source: item.source,
      summary: item.summary,
      topics: item.topics,
      publishedAt: item.publishedAt,
    })),
  };
}
