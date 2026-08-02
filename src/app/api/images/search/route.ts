import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { searchPexels } from "@/lib/pexels";

export async function POST(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  if (typeof body.query !== "string" || body.query.length < 2) {
    return NextResponse.json({ error: "query string required" }, { status: 400 });
  }
  try {
    const images = await searchPexels(body.query, body.perPage ?? 5);
    return NextResponse.json({ images });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Pexels API error" }, { status: 500 });
  }
}
