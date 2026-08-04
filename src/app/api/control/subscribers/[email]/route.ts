import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseRequest } from "@/lib/supabase";

export async function PATCH(request: Request, { params }: { params: { email: string } }) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const body = await request.json().catch(() => ({}));
  const status = body.status as string | undefined;

  if (!status || !["active", "unsubscribed"].includes(status)) {
    return NextResponse.json({ error: "Invalid status. Must be active or unsubscribed" }, { status: 400 });
  }

  const decodedEmail = decodeURIComponent(params.email);

  try {
    await supabaseRequest(
      `subscribers?email=eq.${encodeURIComponent(decodedEmail)}`,
      { method: "PATCH", body: JSON.stringify({ status }) }
    );
    return NextResponse.json({ success: true, email: decodedEmail, status });
  } catch {
    return NextResponse.json({ error: "Failed to update subscriber" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { email: string } }) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  const decodedEmail = decodeURIComponent(params.email);

  try {
    await supabaseRequest(
      `subscribers?email=eq.${encodeURIComponent(decodedEmail)}`,
      { method: "DELETE" }
    );
    return NextResponse.json({ success: true, email: decodedEmail });
  } catch {
    return NextResponse.json({ error: "Failed to delete subscriber" }, { status: 500 });
  }
}
