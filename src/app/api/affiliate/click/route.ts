import { NextResponse } from "next/server";
import { recordAffiliateClick } from "@/lib/affiliate";

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

  await recordAffiliateClick({
    product_id: productId,
    article_slug: article,
    newsletter_id: newsletter,
    user_agent: userAgent,
    referrer: referrer,
  });

  return new NextResponse(null, { status: 302, headers: { Location: redirectTo } });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  if (!body.product_id) {
    return NextResponse.json({ error: "Missing product_id" }, { status: 400 });
  }

  const userAgent = request.headers.get("user-agent") || "";
  const referrer = request.headers.get("referer") || "";

  await recordAffiliateClick({
    product_id: body.product_id,
    article_slug: body.article_slug || "",
    newsletter_id: body.newsletter_id || "",
    user_agent: userAgent,
    referrer: referrer,
  });

  return NextResponse.json({ ok: true });
}
