import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getRecentArticles, getRecentGroups, getResearchStats } from "@/research/knowledge-base";
import { supabaseRequest } from "@/lib/supabase";

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  try {
    const [articles, groups, stats] = await Promise.all([
      getRecentArticles(),
      getRecentGroups(),
      getResearchStats(),
    ]);

    let analyses: Array<Record<string, unknown>> = [];
    try {
      analyses = await supabaseRequest<Array<Record<string, unknown>>>(
        "research_analyses?select=*&order=created_at.desc&limit=50",
        { method: "GET" }
      ) || [];
    } catch {
      analyses = [];
    }

    return NextResponse.json({
      articles: articles.slice(0, 100),
      groups,
      analyses,
      stats,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to load research data: ${String(error)}` },
      { status: 500 }
    );
  }
}
