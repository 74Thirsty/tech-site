import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseRequest } from "@/lib/supabase";

export type SubscriberRecord = {
  email: string;
  source: string;
  created_at: string;
  status: string;
};

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  try {
    const subscribers = await supabaseRequest<SubscriberRecord[]>(
      "subscribers?select=*&order=created_at.desc",
      { method: "GET" }
    );
    return NextResponse.json({ subscribers: subscribers ?? [] });
  } catch {
    return NextResponse.json({ subscribers: [] });
  }
}
