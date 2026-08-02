import { NextResponse } from "next/server";
import { supabaseRequest } from "@/lib/supabase";

export async function POST(request:Request) {
  const body = await request.json().catch(() => ({}));
  if (typeof body.eventName !== "string") return NextResponse.json({error:"eventName is required"},{status:400});
  await supabaseRequest("analytics_events", {method:"POST",body:JSON.stringify({event_name:body.eventName,path:body.path ?? null,article_slug:body.articleSlug ?? null,metadata:body.metadata ?? {}})});
  return NextResponse.json({recorded:true});
}
