import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateArticleStatus, deleteGeneratedArticle, type ArticleStatus } from "@/lib/generated-articles";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  const status = body.status as ArticleStatus | undefined;

  if (!status || !["PENDING", "PUBLISHED", "REJECTED"].includes(status)) {
    return NextResponse.json({ error: "Invalid status. Must be PENDING, PUBLISHED, or REJECTED" }, { status: 400 });
  }

  const ok = await updateArticleStatus(params.id, status);
  if (!ok) {
    return NextResponse.json({ error: "Failed to update article" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: params.id, status });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const ok = await deleteGeneratedArticle(params.id);
  if (!ok) {
    return NextResponse.json({ error: "Failed to delete article" }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: params.id });
}
