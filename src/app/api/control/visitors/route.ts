import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getVisitors, getVisitorDetail, getVisitorStats, getAffiliateClickStats } from "@/visitor-intelligence";

export const maxDuration = 30;

export async function GET(request: Request) {
  const user = requireAuth(request);
  if (user instanceof Response) return user;

  try {
    const url = new URL(request.url);
    const action = url.searchParams.get("action") ?? "list";

    if (action === "detail") {
      const visitorId = url.searchParams.get("visitor_id");
      if (!visitorId) {
        return NextResponse.json({ error: "Missing visitor_id" }, { status: 400 });
      }
      const detail = await getVisitorDetail(visitorId);
      return NextResponse.json({ ok: true, data: detail });
    }

    if (action === "stats") {
      const stats = await getVisitorStats();
      return NextResponse.json({ ok: true, data: stats });
    }

    if (action === "affiliate-stats") {
      const stats = await getAffiliateClickStats();
      return NextResponse.json({ ok: true, data: stats });
    }

    // Default: visitor list with filters
    const filters = {
      search: url.searchParams.get("search") ?? undefined,
      country: url.searchParams.get("country") ?? undefined,
      region: url.searchParams.get("region") ?? undefined,
      city: url.searchParams.get("city") ?? undefined,
      device_type: url.searchParams.get("device_type") ?? undefined,
      os: url.searchParams.get("os") ?? undefined,
      browser: url.searchParams.get("browser") ?? undefined,
      isp: url.searchParams.get("isp") ?? undefined,
      is_new: url.searchParams.get("is_new") === "true" ? true : url.searchParams.get("is_new") === "false" ? false : undefined,
      date_from: url.searchParams.get("date_from") ?? undefined,
      date_to: url.searchParams.get("date_to") ?? undefined,
      sort_by: url.searchParams.get("sort_by") ?? "last_seen",
      sort_order: (url.searchParams.get("sort_order") as "asc" | "desc") ?? "desc",
      page: parseInt(url.searchParams.get("page") ?? "1", 10),
      limit: parseInt(url.searchParams.get("limit") ?? "25", 10),
    };

    const result = await getVisitors(filters);
    return NextResponse.json({ ok: true, data: result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
