import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { optimizeSeoWithGemini } from "@/seo/optimizer";
import { seoRecommendations } from "@/seo/recommendations";

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  if (typeof body.title !== "string" || typeof body.summary !== "string") {
    return NextResponse.json({ error: "title and summary are required" }, { status: 400 });
  }
  const analysis = await optimizeSeoWithGemini({
    title: body.title,
    summary: body.summary,
    topics: Array.isArray(body.topics) ? body.topics : [],
    body: typeof body.body === "string" ? body.body : undefined,
    slug: typeof body.slug === "string" ? body.slug : undefined,
    existingSlugs: Array.isArray(body.existingSlugs) ? body.existingSlugs : undefined,
  });
  return NextResponse.json({ ...analysis, recommendations: seoRecommendations(analysis) });
}
