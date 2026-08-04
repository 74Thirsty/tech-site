import { runIntelligence } from "@/intelligence/pipeline";
import { githubCollector } from "@/intelligence/collectors/github";
import { hackerNewsCollector } from "@/intelligence/collectors/hackernews";
import { cveCollector } from "@/intelligence/collectors/cve";
import { cryptoCollector } from "@/intelligence/collectors/crypto";
import type { ScoredOpportunity } from "@/intelligence/types";
import { selectTopics, type ArticleTopic } from "./topics";
import { storeGeneratedArticle } from "@/lib/generated-articles";
import { TOPIC_CONTENT } from "./topic-content";

export type GeneratedArticle = {
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
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildArticleBody(topic: ArticleTopic, items: ScoredOpportunity[]): string {
  const sections: string[] = [];
  const content = TOPIC_CONTENT[topic.slug];

  const relevant = items
    .filter(item => {
      const itemTopics = item.topics.map(t => t.toLowerCase());
      return topic.tags.some(t => itemTopics.includes(t.toLowerCase())) ||
             topic.keywords.some(kw =>
               item.title.toLowerCase().includes(kw) ||
               item.summary.toLowerCase().includes(kw)
             );
    })
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5);

  if (content) {
    sections.push(content.intro);
    sections.push(`<h2>THE DEEP DIVE</h2>`);
    sections.push(content.deepDive);

    if (relevant.length > 0) {
      sections.push(`<h3>What's happening right now</h3>`);
      sections.push(`<p>This analysis draws from ${relevant.length} current intelligence signals:</p>`);
      for (const item of relevant) {
        sections.push(`<p><strong>${escapeHtml(item.title)}</strong> — ${escapeHtml(item.summary)}</p>`);
      }
    }

    sections.push(`<h2>PRINCIPLES</h2>`);
    sections.push(`<ol>`);
    for (const p of content.principles) {
      sections.push(`<li>${p}</li>`);
    }
    sections.push(`</ol>`);

    sections.push(`<h2>IN PRACTICE</h2>`);
    for (const ex of content.examples) {
      sections.push(`<h3>${escapeHtml(ex.title)}</h3>`);
      sections.push(ex.body);
    }

    if (relevant.length > 0) {
      sections.push(`<h3>Current Landscape</h3>`);
      for (const item of relevant.slice(0, 3)) {
        sections.push(`<p><strong>${escapeHtml(item.title)}</strong> — ${escapeHtml(item.summary)}</p>`);
      }
    }

    sections.push(`<h2>LIVE SIGNALS</h2>`);
    if (relevant.length > 0) {
      sections.push(`<p>These items surfaced from the intelligence pipeline at generation time.</p>`);
      sections.push(`<ul>`);
      for (const item of relevant) {
        sections.push(`<li><a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.title)}</a> — ${escapeHtml(item.summary)} <em>(${escapeHtml(item.source)})</em></li>`);
      }
      sections.push(`</ul>`);
    } else {
      sections.push(`<p>No live signals matched this topic at generation time. Run research to populate the intelligence pipeline.</p>`);
    }

    sections.push(`<h2>ANTIPATTERNS</h2>`);
    sections.push(`<ul>`);
    for (const ap of content.antiPatterns) {
      sections.push(`<li>${escapeHtml(ap)}</li>`);
    }
    sections.push(`</ul>`);

    sections.push(`<h2>CHECKLIST</h2>`);
    sections.push(`<ul>`);
    for (const c of content.checklist) {
      sections.push(`<li>${escapeHtml(c)}</li>`);
    }
    sections.push(`</ul>`);

    sections.push(`<h2>YOUR MOVE</h2>`);
    sections.push(`<p>${escapeHtml(content.move)}</p>`);
  } else {
    sections.push(`<p>${escapeHtml(topic.excerpt)}</p>`);

    sections.push(`<h2>THE DEEP DIVE</h2>`);
    if (relevant.length > 0) {
      sections.push(`<p>This analysis draws from ${relevant.length} current intelligence signals.</p>`);
      for (const item of relevant) {
        sections.push(`<h3>${escapeHtml(item.title)}</h3>`);
        sections.push(`<p>${escapeHtml(item.summary)}</p>`);
        if (item.url) {
          sections.push(`<p><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Source: ${escapeHtml(item.source)}</a></p>`);
        }
      }
    } else {
      sections.push(`<p>${escapeHtml(topic.subtitle)}. The field continues to evolve as practitioners discover new attack vectors, defensive strategies, and architectural patterns.</p>`);
      sections.push(`<p>Understanding the fundamentals is the foundation. Every advanced technique builds on core principles that never change.</p>`);
    }

    sections.push(`<h2>PRINCIPLES</h2>`);
    sections.push(`<ol>`);
    sections.push(`<li><strong>Understand the threat model before implementing defenses.</strong> Every system has different risks. Defending against everything defends against nothing.</li>`);
    sections.push(`<li><strong>Layer your defenses.</strong> No single control is sufficient. Defense in depth means one failure does not compromise the entire system.</li>`);
    sections.push(`<li><strong>Automate detection.</strong> Manual monitoring does not scale. Build systems that alert on anomalies, not thresholds.</li>`);
    sections.push(`<li><strong>Test your defenses.</strong> An untested security control is a theoretical control. Red team your own infrastructure.</li>`);
    sections.push(`<li><strong>Document everything.</strong> The incident response playbook written during the incident is too late. Write it before.</li>`);
    sections.push(`</ol>`);

    sections.push(`<h2>IN PRACTICE</h2>`);
    sections.push(`<p>Start with the basics. Identify your assets, map your attack surface, and prioritize your defenses based on risk, not convenience.</p>`);

    sections.push(`<h2>LIVE SIGNALS</h2>`);
    if (relevant.length > 0) {
      sections.push(`<ul>`);
      for (const item of relevant) {
        sections.push(`<li><a href="${escapeHtml(item.url)}" target="_blank">${escapeHtml(item.title)}</a> — ${escapeHtml(item.summary)} <em>(${escapeHtml(item.source)})</em></li>`);
      }
      sections.push(`</ul>`);
    } else {
      sections.push(`<p>No live signals matched this topic at generation time. Run research to populate the intelligence pipeline.</p>`);
    }

    sections.push(`<h2>ANTIPATTERNS</h2>`);
    sections.push(`<ul>`);
    sections.push(`<li>Implementing security controls without understanding the threat they address</li>`);
    sections.push(`<li>Ignoring logging and monitoring until after an incident</li>`);
    sections.push(`<li>Relying on a single layer of defense for critical assets</li>`);
    sections.push(`<li>Skipping regular security reviews because "nothing has changed"</li>`);
    sections.push(`</ul>`);

    sections.push(`<h2>CHECKLIST</h2>`);
    sections.push(`<ul>`);
    sections.push(`<li>Threat model is documented and current</li>`);
    sections.push(`<li>All critical assets are identified and classified</li>`);
    sections.push(`<li>Defense-in-depth controls are implemented</li>`);
    sections.push(`<li>Logging and monitoring cover the attack surface</li>`);
    sections.push(`<li>Incident response playbook is tested quarterly</li>`);
    sections.push(`</ul>`);

    sections.push(`<h2>YOUR MOVE</h2>`);
    sections.push(`<p>Open a terminal, test one idea, and return with a sharper question.</p>`);
  }

  return sections.join("\n");
}

export async function generateFourArticles(): Promise<{
  success: boolean;
  articles: GeneratedArticle[];
  errors: string[];
  researchCount: number;
}> {
  const errors: string[] = [];

  console.log("Running research pipeline for article generation...");
  let research;
  try {
    research = await runIntelligence([githubCollector, hackerNewsCollector, cveCollector, cryptoCollector]);
    console.log(`Collected ${research.items.length} intelligence items (${research.errors.length} errors)`);
    errors.push(...research.errors);
  } catch (error) {
    errors.push(`Research pipeline failed: ${String(error)}`);
    research = { items: [], errors: [String(error)] };
  }

  const topics = selectTopics(research.items, 4);
  console.log(`Selected ${topics.length} topics for article generation`);

  const articles: GeneratedArticle[] = [];
  const now = new Date();

  for (let i = 0; i < topics.length; i++) {
    const topic = topics[i];
    try {
      console.log(`Generating article: ${topic.title}`);
      const body = buildArticleBody(topic, research.items);

      const publishAt = new Date(now);
      publishAt.setDate(publishAt.getDate() + i);
      publishAt.setHours(9, 0, 0, 0);

      const article: GeneratedArticle = {
        slug: topic.slug,
        title: topic.title,
        subtitle: topic.subtitle,
        category: topic.category,
        difficulty: topic.difficulty,
        readTime: topic.readTime,
        xp: topic.xp,
        excerpt: topic.excerpt,
        tags: topic.tags,
        body,
        generatedAt: now.toISOString(),
        publishAt: publishAt.toISOString(),
        researchSources: research.items
          .filter(item => {
            const itemTopics = item.topics.map(t => t.toLowerCase());
            return topic.tags.some(t => itemTopics.includes(t.toLowerCase()));
          })
          .slice(0, 5)
          .map(item => item.url),
      };

      articles.push(article);
      console.log(`Generated: ${topic.title} (publishes ${publishAt.toISOString().slice(0, 10)})`);
    } catch (error) {
      errors.push(`Failed to generate "${topic.title}": ${String(error)}`);
    }
  }

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
    console.log(`Stored ${stored}/${articles.length} articles in Supabase`);
  }

  return {
    success: articles.length > 0,
    articles,
    errors,
    researchCount: research.items.length,
  };
}
