import { supabaseRequest } from "@/lib/supabase";

export type AffiliateProgram = {
  id: string;
  name: string;
  network: string;
  affiliate_id: string;
  base_url: string;
  commission_type: string;
  commission_rate: string;
  cookie_days: number;
  enabled: boolean;
  created_at: string;
};

export type AffiliateProduct = {
  id: string;
  program_id: string;
  name: string;
  category: string;
  vendor: string;
  description: string;
  affiliate_url: string;
  image_url: string;
  price: string;
  rating: number;
  topics: string[];
  enabled: boolean;
  created_at: string;
};

export type AffiliateClick = {
  id: string;
  product_id: string;
  article_slug: string;
  newsletter_id: string;
  clicked_at: string;
  user_agent: string;
  referrer: string;
};

export type AffiliateConversion = {
  id: string;
  click_id: string;
  product_id: string;
  amount: number;
  commission: number;
  converted_at: string;
};

export type AffiliateInsight = {
  id: string;
  insight_type: string;
  title: string;
  description: string;
  product_id: string | null;
  article_slug: string | null;
  priority: string;
  created_at: string;
};

// ─── Programs ────────────────────────────────────────────────────────────────

export async function getAffiliatePrograms(): Promise<AffiliateProgram[]> {
  try {
    return await supabaseRequest<AffiliateProgram[]>(
      "affiliate_programs?select=*&order=created_at.desc",
      { method: "GET" }
    ) ?? [];
  } catch { return []; }
}

export async function createAffiliateProgram(program: Omit<AffiliateProgram, "id" | "created_at">): Promise<boolean> {
  try {
    await supabaseRequest("affiliate_programs", {
      method: "POST",
      body: JSON.stringify({ ...program, created_at: new Date().toISOString() }),
    });
    return true;
  } catch { return false; }
}

export async function updateAffiliateProgram(id: string, updates: Partial<AffiliateProgram>): Promise<boolean> {
  try {
    await supabaseRequest(`affiliate_programs?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return true;
  } catch { return false; }
}

export async function deleteAffiliateProgram(id: string): Promise<boolean> {
  try {
    await supabaseRequest(`affiliate_programs?id=eq.${id}`, { method: "DELETE" });
    return true;
  } catch { return false; }
}

// ─── Products ────────────────────────────────────────────────────────────────

export async function getAffiliateProducts(): Promise<AffiliateProduct[]> {
  try {
    return await supabaseRequest<AffiliateProduct[]>(
      "affiliate_products?select=*&order=created_at.desc",
      { method: "GET" }
    ) ?? [];
  } catch { return []; }
}

export async function getProductsByTopic(topic: string): Promise<AffiliateProduct[]> {
  try {
    return await supabaseRequest<AffiliateProduct[]>(
      `affiliate_products?enabled=eq.true&topics=cs.{${encodeURIComponent(topic)}}&select=*`,
      { method: "GET" }
    ) ?? [];
  } catch { return []; }
}

export async function getProductsByCategory(category: string): Promise<AffiliateProduct[]> {
  try {
    return await supabaseRequest<AffiliateProduct[]>(
      `affiliate_products?enabled=eq.true&category=eq.${encodeURIComponent(category)}&select=*`,
      { method: "GET" }
    ) ?? [];
  } catch { return []; }
}

export async function createAffiliateProduct(product: Omit<AffiliateProduct, "id" | "created_at">): Promise<boolean> {
  try {
    await supabaseRequest("affiliate_products", {
      method: "POST",
      body: JSON.stringify({ ...product, created_at: new Date().toISOString() }),
    });
    return true;
  } catch { return false; }
}

export async function updateAffiliateProduct(id: string, updates: Partial<AffiliateProduct>): Promise<boolean> {
  try {
    await supabaseRequest(`affiliate_products?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return true;
  } catch { return false; }
}

export async function deleteAffiliateProduct(id: string): Promise<boolean> {
  try {
    await supabaseRequest(`affiliate_products?id=eq.${id}`, { method: "DELETE" });
    return true;
  } catch { return false; }
}

// ─── Clicks ──────────────────────────────────────────────────────────────────

export async function recordAffiliateClick(click: Omit<AffiliateClick, "id" | "clicked_at">): Promise<string | null> {
  try {
    const results = await supabaseRequest<AffiliateClick[]>("affiliate_clicks", {
      method: "POST",
      body: JSON.stringify({
        ...click,
        clicked_at: new Date().toISOString(),
      }),
      headers: { Prefer: "return=representation" },
    });
    return results?.[0]?.id ?? null;
  } catch { return null; }
}

export async function getAffiliateClicks(limit: number = 100): Promise<AffiliateClick[]> {
  try {
    return await supabaseRequest<AffiliateClick[]>(
      `affiliate_clicks?select=*&order=clicked_at.desc&limit=${limit}`,
      { method: "GET" }
    ) ?? [];
  } catch { return []; }
}

export async function getClickCountByProduct(productId: string): Promise<number> {
  try {
    const results = await supabaseRequest<Array<{ count: number }>>(
      `affiliate_clicks?product_id=eq.${productId}&select=count`,
      { method: "GET" }
    );
    return results?.[0]?.count ?? 0;
  } catch { return 0; }
}

export async function getClickCountByArticle(slug: string): Promise<number> {
  try {
    const results = await supabaseRequest<Array<{ count: number }>>(
      `affiliate_clicks?article_slug=eq.${encodeURIComponent(slug)}&select=count`,
      { method: "GET" }
    );
    return results?.[0]?.count ?? 0;
  } catch { return 0; }
}

// ─── Conversions ─────────────────────────────────────────────────────────────

export async function recordAffiliateConversion(conv: Omit<AffiliateConversion, "id" | "converted_at">): Promise<boolean> {
  try {
    await supabaseRequest("affiliate_conversions", {
      method: "POST",
      body: JSON.stringify({ ...conv, converted_at: new Date().toISOString() }),
    });
    return true;
  } catch { return false; }
}

export async function getAffiliateConversions(): Promise<AffiliateConversion[]> {
  try {
    return await supabaseRequest<AffiliateConversion[]>(
      "affiliate_conversions?select=*&order=converted_at.desc",
      { method: "GET" }
    ) ?? [];
  } catch { return []; }
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getAffiliateStats(): Promise<{
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommission: number;
  topProducts: { product_id: string; clicks: number }[];
  topArticles: { article_slug: string; clicks: number }[];
  clicksByDay: { date: string; count: number }[];
}> {
  const clicks = await getAffiliateClicks(500);
  const conversions = await getAffiliateConversions();

  const clicksByDay: Record<string, number> = {};
  const productClicks: Record<string, number> = {};
  const articleClicks: Record<string, number> = {};

  for (const click of clicks) {
    const day = click.clicked_at.slice(0, 10);
    clicksByDay[day] = (clicksByDay[day] || 0) + 1;
    productClicks[click.product_id] = (productClicks[click.product_id] || 0) + 1;
    if (click.article_slug) {
      articleClicks[click.article_slug] = (articleClicks[click.article_slug] || 0) + 1;
    }
  }

  return {
    totalClicks: clicks.length,
    totalConversions: conversions.length,
    totalRevenue: conversions.reduce((sum, c) => sum + c.amount, 0),
    totalCommission: conversions.reduce((sum, c) => sum + c.commission, 0),
    topProducts: Object.entries(productClicks)
      .map(([product_id, clicks]) => ({ product_id, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10),
    topArticles: Object.entries(articleClicks)
      .map(([article_slug, clicks]) => ({ article_slug, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10),
    clicksByDay: Object.entries(clicksByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ─── Insights ────────────────────────────────────────────────────────────────

export async function getAffiliateInsights(): Promise<AffiliateInsight[]> {
  try {
    return await supabaseRequest<AffiliateInsight[]>(
      "affiliate_insights?select=*&order=created_at.desc&limit=50",
      { method: "GET" }
    ) ?? [];
  } catch { return []; }
}

export async function createAffiliateInsight(insight: Omit<AffiliateInsight, "id" | "created_at">): Promise<boolean> {
  try {
    await supabaseRequest("affiliate_insights", {
      method: "POST",
      body: JSON.stringify({ ...insight, created_at: new Date().toISOString() }),
    });
    return true;
  } catch { return false; }
}
