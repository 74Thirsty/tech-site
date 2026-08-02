import type { ArticlePlan } from "./types";

export interface ArticleTemplateData {
  slug: string;
  title: string;
  excerpt: string;
  intro: string;
  deepDive: string;
  principles: string[];
  examples: Array<{ title: string; body: string }>;
  antiPatterns: string[];
  checklist: string[];
  move: string;
  image?: {
    url: string;
    alt: string;
    photographer?: string;
    photographerUrl?: string;
    sourceUrl?: string;
  };
  liveSignals?: Array<{ title: string; summary: string; url: string; source: string }>;
}

export interface FormattedArticle {
  type: "ARTICLE" | "MISSION";
  title: string;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  sections: string[];
  requiresApproval: boolean;
  body: string;
}

export function formatMission(plan: ArticlePlan): FormattedArticle {
  return {
    type: "MISSION",
    title: plan.title,
    difficulty: "INTERMEDIATE",
    sections: plan.sections,
    requiresApproval: true,
    body: formatArticleBody({
      slug: plan.title.toLowerCase().replace(/\s+/g, "-"),
      title: plan.title,
      excerpt: plan.angle,
      intro: "",
      deepDive: `<p>${plan.angle}</p>`,
      principles: [],
      examples: [],
      antiPatterns: [],
      checklist: [],
      move: "",
    }),
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatArticleBody(data: ArticleTemplateData): string {
  const sections: string[] = [];

  if (data.image) {
    const photo = data.image.photographer
      ? `Photo by <a href="${escapeHtml(data.image.photographerUrl || "")}" target="_blank" rel="noopener">${escapeHtml(data.image.photographer)}</a> on <a href="${escapeHtml(data.image.sourceUrl || "")}" target="_blank" rel="noopener">Pexels</a>`
      : "";
    sections.push(
      `<figure class="article-hero"><img src="${escapeHtml(data.image.url)}" alt="${escapeHtml(data.image.alt)}" width="1200" height="675" loading="eager" />${photo ? `<figcaption>${photo}</figcaption>` : ""}</figure>`,
    );
  }

  if (data.intro) {
    sections.push(data.intro);
  }

  sections.push(`<h2>THE DEEP DIVE</h2>`);
  if (data.deepDive) {
    sections.push(data.deepDive);
  }

  if (data.principles.length > 0) {
    sections.push(`<h2>PRINCIPLES</h2>`);
    sections.push(`<ol>`);
    for (const p of data.principles) {
      sections.push(`<li>${escapeHtml(p)}</li>`);
    }
    sections.push(`</ol>`);
  }

  if (data.examples.length > 0) {
    sections.push(`<h2>IN PRACTICE</h2>`);
    for (const ex of data.examples) {
      sections.push(`<h3>${escapeHtml(ex.title)}</h3>`);
      sections.push(`<p>${escapeHtml(ex.body)}</p>`);
    }
  }

  if (data.liveSignals && data.liveSignals.length > 0) {
    sections.push(`<h2>LIVE SIGNALS</h2>`);
    sections.push(`<p>These items surfaced from the intelligence pipeline at generation time.</p>`);
    sections.push(`<ul>`);
    for (const signal of data.liveSignals) {
      sections.push(
        `<li><a href="${escapeHtml(signal.url)}" target="_blank">${escapeHtml(signal.title)}</a> — ${escapeHtml(signal.summary)} <em>(${escapeHtml(signal.source)})</em></li>`,
      );
    }
    sections.push(`</ul>`);
  }

  if (data.antiPatterns.length > 0) {
    sections.push(`<h2>ANTIPATTERNS</h2>`);
    sections.push(`<ul>`);
    for (const ap of data.antiPatterns) {
      sections.push(`<li>${escapeHtml(ap)}</li>`);
    }
    sections.push(`</ul>`);
  }

  if (data.checklist.length > 0) {
    sections.push(`<h2>CHECKLIST</h2>`);
    sections.push(`<ul>`);
    for (const c of data.checklist) {
      sections.push(`<li>${escapeHtml(c)}</li>`);
    }
    sections.push(`</ul>`);
  }

  if (data.move) {
    sections.push(`<h2>YOUR MOVE</h2>`);
    sections.push(`<p>${escapeHtml(data.move)}</p>`);
  }

  return sections.join("\n");
}
