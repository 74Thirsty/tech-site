import { supabaseRequest } from "@/lib/supabase";

export type StoredArticle = {
  id?: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  read_time: string;
  xp: number;
  excerpt: string;
  body: string;
  published_at?: string;
  tags?: string[];
  generated_at?: string;
};

export async function storeGeneratedArticle(article: StoredArticle, publishAt: string): Promise<boolean> {
  try {
    await supabaseRequest("articles", {
      method: "POST",
      body: JSON.stringify({
        slug: article.slug,
        title: article.title,
        category: article.category,
        difficulty: article.difficulty,
        read_time: article.read_time,
        xp: article.xp,
        excerpt: article.excerpt,
        body: article.body,
        published_at: publishAt,
        tags: article.tags ?? [],
        generated_at: new Date().toISOString(),
      }),
    });
    return true;
  } catch {
    return false;
  }
}

export async function getGeneratedArticle(slug: string): Promise<StoredArticle | null> {
  try {
    const results = await supabaseRequest<StoredArticle[]>(
      `articles?slug=eq.${encodeURIComponent(slug)}&select=*`,
      { method: "GET" }
    );
    if (!results || results.length === 0) return null;
    return results[0];
  } catch {
    return null;
  }
}

export async function getAllPublishedArticles(): Promise<StoredArticle[]> {
  try {
    const now = new Date().toISOString();
    const results = await supabaseRequest<StoredArticle[]>(
      `articles?published_at=lte.${encodeURIComponent(now)}&select=*&order=xp.desc`,
      { method: "GET" }
    );
    return results ?? [];
  } catch {
    return [];
  }
}

export async function getAllGeneratedArticles(): Promise<StoredArticle[]> {
  try {
    const results = await supabaseRequest<StoredArticle[]>(
      "articles?select=*&order=xp.desc",
      { method: "GET" }
    );
    return results ?? [];
  } catch {
    return [];
  }
}

export async function countScheduledArticles(): Promise<number> {
  try {
    const now = new Date();
    const sevenDays = new Date(now);
    sevenDays.setDate(sevenDays.getDate() + 7);
    const results = await supabaseRequest<StoredArticle[]>(
      `articles?published_at=gt.${encodeURIComponent(now.toISOString())}&published_at=lte.${encodeURIComponent(sevenDays.toISOString())}&select=id`,
      { method: "GET" }
    );
    return results?.length ?? 0;
  } catch {
    return 0;
  }
}
