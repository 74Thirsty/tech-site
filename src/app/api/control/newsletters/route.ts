import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { supabaseRequest } from "@/lib/supabase";

export type NewsletterIssue = {
  id: string;
  subject: string;
  status: string;
  content: unknown;
  created_at: string;
};

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  try {
    const issues = await supabaseRequest<NewsletterIssue[]>(
      "newsletter_issues?select=*&order=created_at.desc",
      { method: "GET" }
    );
    return NextResponse.json({ issues: issues ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("does not exist") || msg.includes("404") || msg.includes("relation")) {
      return NextResponse.json({
        issues: [],
        error: "newsletter_issues table not found in Supabase. Run the migration first.",
      });
    }
    return NextResponse.json({ issues: [], error: msg });
  }
}
