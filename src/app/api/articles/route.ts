import { NextResponse } from "next/server";
import { getAllPublishedArticles } from "@/lib/generated-articles";

export const dynamic = "force-dynamic";

export async function GET() {
  const articles = await getAllPublishedArticles();
  return NextResponse.json({ articles });
}
