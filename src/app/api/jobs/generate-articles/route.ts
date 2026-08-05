import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateFourArticles } from "@/articles/generator";
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

    if (upcoming.length >= 2) {
      return NextResponse.json({
        skipped: true,
        reason: `${upcoming.length} articles already scheduled for the next 7 days`,
        upcoming: upcoming.map(a => ({ slug: a.slug, published_at: a.published_at })),
      });
    }

    console.log("Auto-generating articles: fewer than 2 scheduled for next 7 days");
    const result = await generateFourArticles();

    if (result.articles.length > 0) {
      const list = result.articles.map((a, i) => `${i + 1}. **${a.title}** (${a.category})`).join("\n");
      await publishDiscord(
        `**${result.articles.length} articles auto-generated — awaiting approval**\n${list}\n\nApprove: https://stratagemconsulting.net/control`
      );
    }

    return NextResponse.json({
      success: result.success,
      generated: result.articles.length,
      articles: result.articles.map(a => ({
        slug: a.slug,
        title: a.title,
        publishAt: a.publishAt,
      })),
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
