import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateContent } from "@/lib/ai";
import { getAffiliateProducts, createAffiliateInsight } from "@/lib/affiliate";
import { supabaseRequest } from "@/lib/supabase";

export const maxDuration = 120;

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  body: string;
  tags: string[];
  status: string;
};

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  try {
    const articles = await supabaseRequest<ArticleRow[]>(
      "articles?status=eq.PUBLISHED&select=*&order=generated_at.desc&limit=20",
      { method: "GET" }
    );

    const products = await getAffiliateProducts();
    const enabledProducts = products.filter(p => p.enabled);

    if (!articles?.length || !enabledProducts.length) {
      return NextResponse.json({ insights: [], message: "Need published articles and enabled products" });
    }

    const articleSummaries = articles.map(a =>
      `- "${a.title}" [${a.category}] tags: ${a.tags?.join(", ")} — ${a.excerpt?.slice(0, 100)}`
    ).join("\n");

    const productSummaries = enabledProducts.map(p =>
      `- ${p.name} (${p.category}) — ${p.description?.slice(0, 80)} — topics: ${p.topics?.join(", ")}`
    ).join("\n");

    const prompt = `You are an affiliate marketing intelligence agent. Analyze the published articles and available affiliate products to find the best matching opportunities.

PUBLISHED ARTICLES:
${articleSummaries}

AVAILABLE AFFILIATE PRODUCTS:
${productSummaries}

For each insight, identify:
1. Articles that are missing relevant product recommendations
2. Products that could be naturally recommended in specific articles
3. Content gaps where new articles could promote high-value products
4. Popular product categories based on article topics

Respond ONLY with valid JSON (no markdown) in this format:
{
  "insights": [
    {
      "type": "MISSING_PRODUCTS",
      "title": "Article title that should recommend a product",
      "description": "Why this product fits and what it would add",
      "articleSlug": "article-slug",
      "productCategory": "category name",
      "priority": "HIGH"
    },
    {
      "type": "CONTENT_OPPORTUNITY",
      "title": "New article idea that would drive affiliate revenue",
      "description": "Article topic and which products it would feature",
      "productCategory": "category name",
      "priority": "MEDIUM"
    },
    {
      "type": "TOP_CATEGORY",
      "title": "High-demand product category",
      "description": "Why this category is popular and which products to feature",
      "productCategory": "category name",
      "priority": "LOW"
    }
  ]
}

Rules:
- Be specific — reference actual article titles and product names
- Prioritize recommendations that genuinely help the reader
- Focus on products that solve problems mentioned in the articles
- Never recommend products just for commission — they must add value
- Generate 5-10 insights maximum`;

    const text = await generateContent(prompt);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Failed to parse AI response");

    const parsed = JSON.parse(jsonMatch[0].replace(/[\x00-\x1f\x7f]/g, " "));
    const insights = parsed.insights || [];

    for (const insight of insights) {
      await createAffiliateInsight({
        insight_type: insight.type || "GENERAL",
        title: insight.title || "",
        description: insight.description || "",
        product_id: null,
        article_slug: insight.articleSlug || null,
        priority: insight.priority || "MEDIUM",
      });
    }

    return NextResponse.json({ insights, count: insights.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ insights: [], error: msg });
  }
}
