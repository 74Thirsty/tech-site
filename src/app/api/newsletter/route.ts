import { NextResponse } from "next/server";
import { normalizeSubscriber } from "@/newsletter/subscriber";
import { generateIssue } from "@/newsletter/issue-generator";
import { renderNewsletterHtml } from "@/newsletter/templates";
import { sendSubscriberConfirmation } from "@/lib/resend";

export const maxDuration = 300;
import { supabaseRequest } from "@/lib/supabase";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.action === "generate") {
    try {
      const { issue, guide } = await generateIssue();

      const html = renderNewsletterHtml(guide.subject, [
        {
          name: "THE SIGNAL",
          raw: guide.mainGuide,
        },
        {
          name: "SUMMARY",
          whatHappened: guide.summary,
        },
        {
          name: "FURTHER READING",
          items: guide.furtherReading.map((r) => ({
            title: r.split("—")[0]?.trim() || r,
            body: r.split("—")[1]?.trim() || "",
            href: r.match(/https?:\/\/[^\s]+/)?.[0],
          })),
        },
      ]);

      return NextResponse.json({ issue, guide, html });
    } catch (error) {
      return NextResponse.json(
        { error: `Generation failed: ${String(error)}` },
        { status: 500 }
      );
    }
  }

  if (typeof body.email !== "string" || !body.email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const subscriber = normalizeSubscriber(body.email);
  await supabaseRequest("subscribers", {
    method: "POST",
    body: JSON.stringify(subscriber),
  });
  const confirmation = await sendSubscriberConfirmation(subscriber.email);
  return NextResponse.json(
    {
      subscriber,
      message: confirmation.sent
        ? "Subscriber confirmed."
        : "Subscriber saved; email provider is not configured.",
    },
    { status: 201 }
  );
}
