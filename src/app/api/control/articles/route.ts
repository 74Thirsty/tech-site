import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getAllGeneratedArticles, getPendingArticles, type ArticleStatus } from "@/lib/generated-articles";

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const url = new URL(request.url);
  const status = url.searchParams.get("status") as ArticleStatus | null;

  if (status === "PENDING") {
    const articles = await getPendingArticles();
    return NextResponse.json({ articles });
  }

  const articles = await getAllGeneratedArticles();
  return NextResponse.json({ articles });
}
