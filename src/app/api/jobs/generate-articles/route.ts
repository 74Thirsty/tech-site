import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateSingleArticle } from "@/articles/generator";
import { getAllGeneratedArticles } from "@/lib/generated-articles";
import { publishDiscord } from "@/distribution/discord-publisher";

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  try {
    const existing = await getAllGeneratedArticles();
    const now = new Date();
    const sevenDaysFromNow = new Date(now);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const upcoming = existing.filter(a => {
      const pub = new Date(a.published_at ?? "");
      return !isNaN(pub.getTime()) && pub >= now && pub <= sevenDaysFromNow;
    });

    if (upcoming.length >= 1) {
      return NextResponse.json({
        skipped: true,
        reason: `${upcoming.length} articles already scheduled for the next 7 days`,
        upcoming: upcoming.map(a => ({ slug: a.slug, published_at: a.published_at })),
      });
    }

    console.log("Auto-generating 1 article: no articles scheduled for next 7 days");
    const result = await generateSingleArticle();

    if (result.success && result.article) {
      await publishDiscord(
        `**1 article auto-generated — awaiting approval**\n**${result.article.title}** (${result.article.category})\n\nApprove: https://stratagemconsulting.net/control`
      );
    }

    return NextResponse.json({
      success: result.success,
      generated: result.article ? 1 : 0,
      article: result.article ? {
        slug: result.article.slug,
        title: result.article.title,
        publishAt: result.article.publishAt,
      } : null,
      errors: result.errors,
      researchCount: result.researchCount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: `Auto-generation failed: ${String(error)}` },
      { status: 500 }
    );
  }
}
