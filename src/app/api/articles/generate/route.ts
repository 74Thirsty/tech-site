import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateFourArticles } from "@/articles/new-generator";
import { publishDiscord } from "@/distribution/discord-publisher";

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));

  if (body.action === "generate-all" || body.action === "generate-four") {
    const result = await generateFourArticles();

    if (result.articles.length > 0) {
      const list = result.articles.map((a, i) => `${i + 1}. **${a.title}** (${a.category})`).join("\n");
      await publishDiscord(
        `**${result.articles.length} articles generated — awaiting approval**\n${list}\n\nApprove: https://stratagemconsulting.net/control`
      );
    }

    return NextResponse.json({
      success: result.success,
      generated: result.articles.length,
      failed: result.errors.length,
      articles: result.articles.map(a => ({ slug: a.slug, title: a.title, category: a.category })),
      errors: result.errors,
      researchCount: result.researchCount,
    });
  }

  return NextResponse.json(
    { error: "Provide { action: 'generate-all' } or { action: 'generate-four' }" },
    { status: 400 },
  );
}
