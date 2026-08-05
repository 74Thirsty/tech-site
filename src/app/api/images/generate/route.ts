import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { findBestImage } from "@/lib/pexels";
import { saveImage, loadImages } from "@/content/image-store";
import { getAllGeneratedArticles } from "@/lib/generated-articles";

export const maxDuration = 60;

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  const targetSlug = typeof body.slug === "string" ? body.slug : null;

  const existing = await loadImages();
  const allArticles = await getAllGeneratedArticles();

  const targets = targetSlug
    ? allArticles.filter((a) => a.slug === targetSlug)
    : allArticles.filter((a) => !existing[a.slug]);

  if (targets.length === 0) {
    return NextResponse.json({ message: "All articles already have images", skipped: true });
  }

  const results: Array<{ slug: string; success: boolean; url?: string; error?: string }> = [];

  for (const article of targets) {
    try {
      const image = await findBestImage(article.tags ?? [], article.title);
      if (image) {
        await saveImage(article.slug, image);
        results.push({ slug: article.slug, success: true, url: image.url });
      } else {
        results.push({ slug: article.slug, success: false, error: "No images found" });
      }
    } catch (e: any) {
      results.push({ slug: article.slug, success: false, error: e.message });
    }
  }

  return NextResponse.json({
    generated: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  });
}
