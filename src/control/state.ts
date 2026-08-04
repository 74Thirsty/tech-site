import { articles, books, projects } from "@/lib/content";
import { generatePremiumGuide, type NewsletterGuide } from "@/newsletter/guide-generator";
import { supabaseRequest } from "@/lib/supabase";
import { getPendingArticles, getAllGeneratedArticles } from "@/lib/generated-articles";

type QueueItem = {
  id: string;
  kind: string;
  title: string;
  status: "NEEDS_REVIEW" | "APPROVED" | "SENT";
  createdAt: string;
};

type ArticleGenerationResult = {
  id: string;
  topicCount: number;
  generatedAt: string;
  status: "COMPLETE" | "FAILED";
  errors: string[];
};

export type ControlState = {
  issue: NewsletterGuide | null;
  queue: QueueItem[];
  timeline: string[];
  lastResearch: string | null;
  counts: { articles: number; projects: number; books: number; pendingArticles: number; publishedArticles: number; newsletters: number; subscribers: number };
  articleGenerations: ArticleGenerationResult[];
  researchRuns: number;
};

const globalState = globalThis as typeof globalThis & { neonForgeControl?: ControlState };
if (!globalState.neonForgeControl) {
  globalState.neonForgeControl = {
    issue: null,
    queue: [],
    timeline: [],
    lastResearch: null,
    counts: { articles: articles.length, projects: projects.length, books: books.length, pendingArticles: 0, publishedArticles: 0, newsletters: 0, subscribers: 0 },
    articleGenerations: [],
    researchRuns: 0,
  };
}

export function getControlState(): ControlState {
  return globalState.neonForgeControl!;
}

export async function loadControlState(): Promise<ControlState> {
  const state = getControlState();
  state.counts = { articles: articles.length, projects: projects.length, books: books.length, pendingArticles: 0, publishedArticles: 0, newsletters: 0, subscribers: 0 };

  if (hasSupabase()) {
    try {
      const [pending, allArticles, newsletters, subs] = await Promise.all([
        getPendingArticles(),
        getAllGeneratedArticles(),
        supabaseRequest<Array<{ id: string }>>("newsletter_issues?select=id", { method: "GET" }),
        supabaseRequest<Array<{ email: string }>>("subscribers?select=email", { method: "GET" }),
      ]);
      state.counts.pendingArticles = pending.length;
      state.counts.publishedArticles = allArticles.filter(a => a.status === "PUBLISHED").length;
      state.counts.newsletters = newsletters?.length ?? 0;
      state.counts.subscribers = subs?.length ?? 0;
    } catch {
      // counts stay at defaults
    }
  }

  return state;
}

export async function updateControl(action: string, id?: string): Promise<ControlState> {
  const state = getControlState();

  if (action === "generate") {
    const guide = await generatePremiumGuide();
    state.issue = guide;
    state.queue.unshift({
      id: guide.id,
      kind: "NEWSLETTER",
      title: guide.subject,
      status: "NEEDS_REVIEW",
      createdAt: new Date().toISOString(),
    });
    state.timeline.unshift(`Newsletter draft generated: "${guide.subject}"`);

    if (hasSupabase()) {
      try {
        await supabaseRequest("newsletter_issues", {
          method: "POST",
          body: JSON.stringify({
            subject: guide.subject,
            status: "NEEDS_REVIEW",
            content: guide,
          }),
        });
      } catch {
        // Supabase persistence is best-effort
      }
    }
  }

  if (action === "approve" && id) {
    const item = state.queue.find((entry) => entry.id === id);
    if (item) {
      item.status = "APPROVED";
      state.timeline.unshift(`${item.kind} approved: "${item.title}"`);

      if (hasSupabase()) {
        try {
          await supabaseRequest(`newsletter_issues?id=eq.${encodeURIComponent(id)}`, {
            method: "PATCH",
            body: JSON.stringify({ status: "APPROVED" }),
          });
        } catch {
          // Supabase persistence is best-effort
        }
      }
    }
  }

  if (action === "research") {
    state.lastResearch = new Date().toISOString();
    state.researchRuns++;
    state.timeline.unshift("Research pipeline completed successfully");
  }

  if (action === "generate-articles") {
    state.timeline.unshift("Article generation initiated");
  }

  return state;
}

export function recordArticleGeneration(result: ArticleGenerationResult): void {
  const state = getControlState();
  state.articleGenerations.unshift(result);
  const successful = result.status === "COMPLETE" ? result.topicCount : 0;
  state.timeline.unshift(
    result.status === "COMPLETE"
      ? `Generated ${successful} articles — pending approval`
      : `Article generation failed: ${result.errors.join(", ")}`
  );
  state.counts = { articles: articles.length, projects: projects.length, books: books.length, pendingArticles: state.counts.pendingArticles + successful, publishedArticles: state.counts.publishedArticles, newsletters: state.counts.newsletters, subscribers: state.counts.subscribers };
}

export function recordResearch(result: { outputCount: number; errors: string[] }): void {
  const state = getControlState();
  state.lastResearch = new Date().toISOString();
  state.researchRuns++;
  state.timeline.unshift(
    result.errors.length > 0
      ? `Research completed with ${result.errors.length} errors: ${result.outputCount} opportunities`
      : `Research completed: ${result.outputCount} opportunities collected`
  );
}

function hasSupabase(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
