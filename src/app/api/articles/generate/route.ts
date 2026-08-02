import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { generateAllArticles, generateArticleBySlug } from "@/articles/generator";

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));

  if (typeof body.slug === "string") {
    const result = await generateArticleBySlug(body.slug);
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  }

  if (body.action === "generate-all") {
    const results = await generateAllArticles();
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    return NextResponse.json({
      success: true,
      generated: successful,
      failed,
      results,
    });
  }

  return NextResponse.json(
    { error: "Provide { slug: '...' } or { action: 'generate-all' }" },
    { status: 400 },
  );
}
