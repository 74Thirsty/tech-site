import { NextResponse } from "next/server";
import { recordAffiliateClick } from "@/lib/affiliate";
import { collectVisitorData, recordVisitorEvent } from "@/visitor-intelligence";

const ALLOWED_REDIRECT_PROTOCOLS = ["http:", "https:"];

function isSafeRedirect(target: string): boolean {
  try {
    const parsed = new URL(target);
    return ALLOWED_REDIRECT_PROTOCOLS.includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const productId = url.searchParams.get("p");
  const article = url.searchParams.get("a") || "";
  const newsletter = url.searchParams.get("n") || "";
  const redirectTo = url.searchParams.get("url") || "/";

  if (!productId) {
    return NextResponse.json({ error: "Missing product id" }, { status: 400 });
  }

  if (!isSafeRedirect(redirectTo)) {
    return NextResponse.json({ error: "Invalid redirect URL" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";

  // Record affiliate click
  await recordAffiliateClick({
    product_id: productId,
    article_slug: article,
    newsletter_id: newsletter,
    user_agent: userAgent,
    referrer: referrer,
  });

  // Record as visitor event for intelligence tracking
  try {
    const result = await collectVisitorData(request, { path: article || redirectTo });
    if (result.visitorId && result.sessionId) {
      await recordVisitorEvent(result.visitorId, result.sessionId, "affiliate", "affiliate_click", {
        path: article || redirectTo,
        articleSlug: article || undefined,
        metadata: {
          product_id: productId,
          newsletter_id: newsletter,
          redirect_url: redirectTo,
        },
      });
    }
  } catch {
    // Visitor tracking failure never blocks affiliate redirect
  }

  return new NextResponse(null, { status: 302, headers: { Location: redirectTo } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!body.product_id) {
    return NextResponse.json({ error: "Missing product_id" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";

  // Record affiliate click
  await recordAffiliateClick({
    product_id: body.product_id,
    article_slug: body.article_slug || "",
    newsletter_id: body.newsletter_id || "",
    user_agent: userAgent,
    referrer: referrer,
  });

  // Record as visitor event
  try {
    const result = await collectVisitorData(request, { path: body.article_slug || "" });
    if (result.visitorId && result.sessionId) {
      await recordVisitorEvent(result.visitorId, result.sessionId, "affiliate", "affiliate_click", {
        path: body.article_slug || "",
        articleSlug: body.article_slug || undefined,
        metadata: {
          product_id: body.product_id,
          newsletter_id: body.newsletter_id || "",
        },
      });
    }
  } catch {
    // Visitor tracking failure never blocks affiliate response
  }

  return NextResponse.json({ ok: true });
}
