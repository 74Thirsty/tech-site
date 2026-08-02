import { NextResponse } from "next/server";
import { normalizeSubscriber } from "@/newsletter/subscriber";
import { generateIssue } from "@/newsletter/issue-generator";
import { sendSubscriberConfirmation } from "@/lib/resend";
import { supabaseRequest } from "@/lib/supabase";

export async function POST(request:Request) {
  const body = await request.json().catch(() => ({}));
  if (body.action === "generate") return NextResponse.json({issue:generateIssue()});
  if (typeof body.email !== "string" || !body.email.includes("@")) return NextResponse.json({error:"A valid email is required."},{status:400});
  const subscriber = normalizeSubscriber(body.email);
  await supabaseRequest("subscribers", {method:"POST",body:JSON.stringify(subscriber)});
  const confirmation = await sendSubscriberConfirmation(subscriber.email);
  return NextResponse.json({subscriber,message:confirmation.sent ? "Subscriber confirmed." : "Subscriber saved; email provider is not configured."},{status:201});
}
