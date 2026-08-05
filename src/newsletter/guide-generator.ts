import { generateContent } from "@/lib/puter";
import type { ScoredOpportunity } from "@/intelligence/types";
import { runIntelligence } from "@/intelligence/pipeline";
import { githubCollector } from "@/intelligence/collectors/github";
import { hackerNewsCollector } from "@/intelligence/collectors/hackernews";
import { cveCollector } from "@/intelligence/collectors/cve";
import { cryptoCollector, coinGeckoCollector } from "@/intelligence/collectors/crypto";
import { cryptopanicCollector } from "@/intelligence/collectors/cryptopanic";
import { gdeltCollector } from "@/intelligence/collectors/gdelt";
import { newsdataCollector } from "@/intelligence/collectors/newsdata";
import { newsapiCollector } from "@/intelligence/collectors/newsapi";
import { supabaseRequest } from "@/lib/supabase";

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
};

export async function generatePremiumGuide(): Promise<NewsletterGuide> {
  console.log("Running research pipeline for newsletter guide...");
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
    .slice(0, 15);

  const researchContext = topItems.length > 0
    ? `\n\nCURRENT RESEARCH:\n${topItems.map((item, i) => `${i + 1}. [${item.source}] ${item.title} — ${item.summary} (topics: ${item.topics.join(", ")})`).join("\n")}`
    : "\n\nNo current research available. Generate based on established technical knowledge.";

  const prompt = `You are a senior technical educator writing a premium newsletter guide for engineers.

Based on the following research, generate a comprehensive technical guide.
${researchContext}

Respond ONLY with valid JSON (no markdown fences) in this exact format:
{
  "title": "Compelling, specific guide title",
  "subtitle": "One sentence explaining what the reader will build or learn",
  "difficulty": "INTERMEDIATE",
  "estimatedReadTime": "XX MIN",
  "learningObjectives": ["Objective 1", "Objective 2", "Objective 3", "Objective 4", "Objective 5"],
  "prerequisites": ["Prerequisite 1", "Prerequisite 2", "Prerequisite 3"],
  "requiredTools": ["Tool 1", "Tool 2", "Tool 3"],
  "topics": ["TOPIC1", "TOPIC2"],
  "tableOfContents": ["Section 1", "Section 2", "Section 3", "Section 4", "Section 5"],
  "mainGuide": "<h2>Section 1 Title</h2><p>Content...</p><h3>Subsection</h3><p>Content...</p><pre><code>// Code example</code></pre>",
  "summary": "2-3 sentence summary of what the guide covers and why it matters",
  "furtherReading": ["Resource 1 with URL", "Resource 2 with URL"]
}

CRITICAL RULES:
1. The mainGuide MUST be a complete, comprehensive tutorial — minimum 3000 words of HTML content.
2. Include real code examples, configuration snippets, and command-line instructions.
3. Reference specific tools, versions, and real-world deployment patterns.
4. Every section must have practical, actionable content — not theoretical overviews.
5. Code blocks must be complete and runnable, not pseudocode.
6. Reference the research signals where relevant — cite real recent events.
7. Use HTML tags: <h2>, <h3>, <p>, <pre><code>, <strong>, <em>, <ul>, <li>, <a>, <blockquote>.
8. Write as if teaching a senior engineer, not a beginner.
9. Every claim must be grounded in real technical facts. Do not fabricate tools, versions, or events.`;

  const text = await generateContent(prompt);

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Failed to parse guide content from Gemini");

  const parsed = JSON.parse(jsonMatch[0]);

  const now = new Date();
  const issueNumber = Math.floor((now.getTime() - new Date("2025-01-01").getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;

  return {
    id: `guide-${now.toISOString().slice(0, 10)}`,
    subject: parsed.title || "Technical Guide",
    subtitle: parsed.subtitle || "",
    issueNumber,
    publishDate: now.toISOString().slice(0, 10),
    estimatedReadTime: parsed.estimatedReadTime || "30 MIN",
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
  };
}
