import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseRequest } from "@/lib/supabase";
import { analyzeWithGemini } from "@/seo/ml-optimizer";

export const maxDuration = 300;

type ArticleRow = {
  id: string;
  slug: string;
  title: string;
  category: string;
  difficulty: string;
  read_time: string;
  xp: number;
  excerpt: string;
  body: string;
  tags: string[];
  status: string;
  published_at: string;
  generated_at: string;
};

type SeoRanking = {
  id: string;
  slug: string;
  title: string;
  category: string;
  status: string;
  xp: number;
  readabilityScore: number;
  engagementScore: number;
  keywordDensity: number;
  metaDescription: string;
  suggestedTitle: string;
  contentGaps: string[];
  keywords: string[];
  overallScore: number;
};

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  try {
    const articles = await supabaseRequest<ArticleRow[]>(
      "articles?select=*&order=generated_at.desc&limit=50",
      { method: "GET" }
    );

    if (!articles?.length) {
      return NextResponse.json({ rankings: [], message: "No articles found" });
    }

    const rankings: SeoRanking[] = [];

    for (const article of articles) {
      try {
        const seo = await analyzeWithGemini({
          title: article.title,
          summary: article.excerpt,
          body: article.body?.slice(0, 2000),
          topics: article.tags || [],
          existingSlugs: [],
        });

        const overallScore = Math.round(
          (seo.readabilityScore * 0.3) +
          (seo.engagementScore * 0.3) +
          (Math.min(100, Math.max(0, 100 - Math.abs(seo.keywordDensity - 2.5) * 20)) * 0.2) +
          (seo.metaDescription.length >= 120 && seo.metaDescription.length <= 155 ? 100 : 50) * 0.2
        );

        rankings.push({
          id: article.id || article.slug,
          slug: article.slug,
          title: article.title,
          category: article.category,
          status: article.status || "PENDING",
          xp: article.xp,
          readabilityScore: seo.readabilityScore,
          engagementScore: seo.engagementScore,
          keywordDensity: seo.keywordDensity,
          metaDescription: seo.metaDescription,
          suggestedTitle: seo.suggestedTitle,
          contentGaps: seo.contentGaps,
          keywords: seo.keywords,
          overallScore,
        });
      } catch {
        rankings.push({
          id: article.id || article.slug,
          slug: article.slug,
          title: article.title,
          category: article.category,
          status: article.status || "PENDING",
          xp: article.xp,
          readabilityScore: 0,
          engagementScore: 0,
          keywordDensity: 0,
          metaDescription: "",
          suggestedTitle: article.title,
          contentGaps: [],
          keywords: article.tags || [],
          overallScore: 0,
        });
      }
    }

    rankings.sort((a, b) => b.overallScore - a.overallScore);

    return NextResponse.json({ rankings });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ rankings: [], error: msg });
  }
}
