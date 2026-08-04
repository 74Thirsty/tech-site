import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseRequest } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  const status = body.status as string | undefined;

  if (!status || !["DRAFT", "NEEDS_REVIEW", "APPROVED", "SENT"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    await supabaseRequest(`newsletter_issues?id=eq.${encodeURIComponent(params.id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    return NextResponse.json({ success: true, id: params.id, status });
  } catch {
    return NextResponse.json({ error: "Failed to update newsletter" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  try {
    await supabaseRequest(`newsletter_issues?id=eq.${encodeURIComponent(params.id)}`, {
      method: "DELETE",
    });
    return NextResponse.json({ success: true, id: params.id });
  } catch {
    return NextResponse.json({ error: "Failed to delete newsletter" }, { status: 500 });
  }
}
