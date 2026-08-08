import { supabaseRequest } from "@/lib/supabase";
import type { Visitor, VisitorSession, VisitorPageView, VisitorEvent, VisitorIntelligenceData, VisitorTableFilters, VisitorTableResult, VisitorStats } from "./types";

// ─── Visitor Intelligence Queries ─────────────────────────────────────────────
// Server-side queries for the admin Visitor Intelligence table.
// All queries use service role key and are protected by auth.

// ─── Visitor Table ────────────────────────────────────────────────────────────

export async function getVisitors(filters: VisitorTableFilters = {}): Promise<VisitorTableResult> {
  const page = filters.page ?? 1;
  const limit = Math.min(filters.limit ?? 25, 100);
  const offset = (page - 1) * limit;

  // Build query parameters
  const params: string[] = [];
  const conditions: string[] = [];

  // Search across multiple fields
  if (filters.search) {
    const search = encodeURIComponent(filters.search);
    conditions.push(`or(visitor_id.ilike.*${search}*,ip_address.ilike.*${search}*,city.ilike.*${search}*,region.ilike.*${search}*,country.ilike.*${search}*,isp.ilike.*${search}*,organization.ilike.*${search}*,browser.ilike.*${search}*,os.ilike.*${search}*,referrer.ilike.*${search}*,landing_page.ilike.*${search}*)`);
  }

  // Filters
  if (filters.country) conditions.push(`country_code=eq.${encodeURIComponent(filters.country)}`);
  if (filters.region) conditions.push(`region=eq.${encodeURIComponent(filters.region)}`);
  if (filters.city) conditions.push(`city=eq.${encodeURIComponent(filters.city)}`);
  if (filters.device_type) conditions.push(`device_type=eq.${encodeURIComponent(filters.device_type)}`);
  if (filters.os) conditions.push(`os=eq.${encodeURIComponent(filters.os)}`);
  if (filters.browser) conditions.push(`browser=eq.${encodeURIComponent(filters.browser)}`);
  if (filters.isp) conditions.push(`isp=eq.${encodeURIComponent(filters.isp)}`);
  if (filters.is_new !== undefined) conditions.push(`is_new=eq.${filters.is_new}`);
  if (filters.date_from) conditions.push(`created_at=gte.${filters.date_from}`);
  if (filters.date_to) conditions.push(`created_at=lte.${filters.date_to}`);

  if (conditions.length > 0) {
    params.push(`&${conditions.join("&")}`);
  }

  // Sorting
  const sortBy = filters.sort_by ?? "last_seen";
  const sortOrder = filters.sort_order ?? "desc";
  params.push(`&order=${sortBy}.${sortOrder}`);

  // Pagination
  params.push(`&limit=${limit}&offset=${offset}`);

  const queryString = params.join("");
  const countParams = conditions.length > 0 ? `?${conditions.join("&")}` : "";

  try {
    // Get total count
    const countResult = await supabaseRequest<Array<{ count: number }>>(
      `visitors${countParams}&select=count`,
      { method: "GET" }
    );
    const total = countResult?.[0]?.count ?? 0;

    // Get visitors
    const visitors = await supabaseRequest<Visitor[]>(
      `visitors?select=*${queryString}`,
      { method: "GET" }
    );

    return {
      visitors: visitors ?? [],
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error(`Visitor query failed: ${String(error)}`);
    return { visitors: [], total: 0, page, limit, pages: 0 };
  }
}

// ─── Visitor Detail ───────────────────────────────────────────────────────────

export async function getVisitorDetail(visitorId: string): Promise<VisitorIntelligenceData | null> {
  try {
    const [visitor, sessions, recentPageViews, recentEvents] = await Promise.all([
      supabaseRequest<Visitor[]>(
        `visitors?visitor_id=eq.${encodeURIComponent(visitorId)}&select=*&limit=1`,
        { method: "GET" }
      ),
      supabaseRequest<VisitorSession[]>(
        `visitor_sessions?visitor_id=eq.${encodeURIComponent(visitorId)}&select=*&order=started_at.desc&limit=20`,
        { method: "GET" }
      ),
      supabaseRequest<VisitorPageView[]>(
        `visitor_page_views?visitor_id=eq.${encodeURIComponent(visitorId)}&select=*&order=created_at.desc&limit=50`,
        { method: "GET" }
      ),
      supabaseRequest<VisitorEvent[]>(
        `visitor_events?visitor_id=eq.${encodeURIComponent(visitorId)}&select=*&order=created_at.desc&limit=100`,
        { method: "GET" }
      ),
    ]);

    if (!visitor || visitor.length === 0) return null;

    // Get IP enrichment if available
    let enrichment = undefined;
    if (visitor[0].ip_address) {
      const enrichmentResult = await supabaseRequest<Array<{ id: string; ip_address: string; country?: string; country_code?: string; region?: string; city?: string; postal_code?: string; latitude?: number; longitude?: number; timezone?: string; isp?: string; organization?: string; asn?: string; network?: string; is_vpn: boolean; is_proxy: boolean; is_tor: boolean; enrichment_source: string; enriched_at: string }>>(
        `ip_enrichments?ip_address=eq.${encodeURIComponent(visitor[0].ip_address)}&select=*&limit=1`,
        { method: "GET" }
      );
      enrichment = enrichmentResult?.[0];
    }

    return {
      visitor: visitor[0],
      sessions: sessions ?? [],
      recentPageViews: recentPageViews ?? [],
      recentEvents: recentEvents ?? [],
      enrichment,
    };
  } catch (error) {
    console.error(`Visitor detail query failed: ${String(error)}`);
    return null;
  }
}

// ─── Visitor Stats ────────────────────────────────────────────────────────────

export async function getVisitorStats(): Promise<VisitorStats> {
  try {
    const [totalResult, sessionsResult, pageViewsResult, eventsResult, newResult] = await Promise.all([
      supabaseRequest<Array<{ count: number }>>("visitors?select=count", { method: "GET" }),
      supabaseRequest<Array<{ count: number }>>("visitor_sessions?select=count", { method: "GET" }),
      supabaseRequest<Array<{ count: number }>>("visitor_page_views?select=count", { method: "GET" }),
      supabaseRequest<Array<{ count: number }>>("visitor_events?select=count", { method: "GET" }),
      supabaseRequest<Array<{ count: number }>>("visitors?is_new=eq.true&select=count", { method: "GET" }),
    ]);

    const totalVisitors = totalResult?.[0]?.count ?? 0;
    const totalSessions = sessionsResult?.[0]?.count ?? 0;
    const totalPageViews = pageViewsResult?.[0]?.count ?? 0;
    const totalEvents = eventsResult?.[0]?.count ?? 0;
    const newVisitors = newResult?.[0]?.count ?? 0;

    // Get top countries
    const topCountries = await supabaseRequest<Array<{ country: string; count: number }>>(
      "visitors?country_code=not.is.null&select=country_code as country,count()&order=count.desc&limit=10",
      { method: "GET" }
    );

    // Get top browsers
    const topBrowsers = await supabaseRequest<Array<{ browser: string; count: number }>>(
      "visitors?browser=not.is.null&select=browser,count()&order=count.desc&limit=10",
      { method: "GET" }
    );

    // Get top devices
    const topDevices = await supabaseRequest<Array<{ device_type: string; count: number }>>(
      "visitors?device_type=not.is.null&select=device_type,count()&order=count.desc&limit=10",
      { method: "GET" }
    );

    // Get top referrers
    const topReferrers = await supabaseRequest<Array<{ referrer_domain: string; count: number }>>(
      "visitors?referrer_domain=not.is.null&select=referrer_domain,count()&order=count.desc&limit=10",
      { method: "GET" }
    );

    // Get visitors by day (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const visitorsByDay = await supabaseRequest<Array<{ date: string; count: number }>>(
      `visitors?created_at=gte.${thirtyDaysAgo}&select=date_trunc('day',created_at) as date,count()&order=date.desc`,
      { method: "GET" }
    );

    return {
      totalVisitors,
      totalSessions,
      totalPageViews,
      totalEvents,
      newVisitors,
      returningVisitors: totalVisitors - newVisitors,
      avgSessionDuration: totalSessions > 0 ? 0 : 0, // Would need aggregation
      avgPageViews: totalVisitors > 0 ? totalPageViews / totalVisitors : 0,
      topCountries: (topCountries ?? []).map(r => ({ country: r.country ?? "Unknown", count: r.count })),
      topBrowsers: (topBrowsers ?? []).map(r => ({ browser: r.browser ?? "Unknown", count: r.count })),
      topDevices: (topDevices ?? []).map(r => ({ device_type: r.device_type ?? "Unknown", count: r.count })),
      topReferrers: (topReferrers ?? []).map(r => ({ referrer_domain: r.referrer_domain ?? "Unknown", count: r.count })),
      visitorsByDay: (visitorsByDay ?? []).map(r => ({ date: String(r.date), count: r.count })),
    };
  } catch (error) {
    console.error(`Visitor stats query failed: ${String(error)}`);
    return {
      totalVisitors: 0,
      totalSessions: 0,
      totalPageViews: 0,
      totalEvents: 0,
      newVisitors: 0,
      returningVisitors: 0,
      avgSessionDuration: 0,
      avgPageViews: 0,
      topCountries: [],
      topBrowsers: [],
      topDevices: [],
      topReferrers: [],
      visitorsByDay: [],
    };
  }
}

// ─── Affiliate Cross-Reference Queries ────────────────────────────────────────

export async function getVisitorsWhoClickedAffiliate(
  productId?: string,
  articleSlug?: string
): Promise<Visitor[]> {
  try {
    let query = "visitor_events?event_type=eq.affiliate&event_name=eq.affiliate_click";

    if (productId) {
      query += `&metadata=cs.{"product_id":"${productId}"}`;
    }
    if (articleSlug) {
      query += `&article_slug=eq.${encodeURIComponent(articleSlug)}`;
    }

    const events = await supabaseRequest<Array<{ visitor_id: string }>>(
      `${query}&select=visitor_id&limit=100`,
      { method: "GET" }
    );

    if (!events || events.length === 0) return [];

    const visitorIds = [...new Set(events.map(e => e.visitor_id))];
    const visitors = await supabaseRequest<Visitor[]>(
      `visitors?visitor_id=in.(${visitorIds.map(id => `"${id}"`).join(",")})&select=*`,
      { method: "GET" }
    );

    return visitors ?? [];
  } catch (error) {
    console.error(`Affiliate visitor query failed: ${String(error)}`);
    return [];
  }
}

export async function getAffiliateEventsForVisitor(
  visitorId: string
): Promise<Array<{ event_name: string; metadata: Record<string, unknown>; created_at: string }>> {
  try {
    const events = await supabaseRequest<Array<{ event_name: string; metadata: Record<string, unknown>; created_at: string }>>(
      `visitor_events?visitor_id=eq.${encodeURIComponent(visitorId)}&event_type=eq.affiliate&select=event_name,metadata,created_at&order=created_at.desc`,
      { method: "GET" }
    );
    return events ?? [];
  } catch (error) {
    console.error(`Affiliate events query failed: ${String(error)}`);
    return [];
  }
}

export async function getAffiliateClickStats(): Promise<{
  totalClicks: number;
  uniqueVisitors: number;
  topProducts: Array<{ product_id: string; clicks: number; unique_visitors: number }>;
  topArticles: Array<{ article_slug: string; clicks: number; unique_visitors: number }>;
  clicksByDevice: Array<{ device_type: string; count: number }>;
  clicksByCountry: Array<{ country: string; count: number }>;
}> {
  try {
    // Get all affiliate events
    const events = await supabaseRequest<Array<{
      visitor_id: string;
      article_slug: string;
      metadata: Record<string, unknown>;
      created_at: string;
    }>>(
      "visitor_events?event_type=eq.affiliate&select=visitor_id,article_slug,metadata,created_at&order=created_at.desc&limit=1000",
      { method: "GET" }
    );

    if (!events || events.length === 0) {
      return {
        totalClicks: 0,
        uniqueVisitors: 0,
        topProducts: [],
        topArticles: [],
        clicksByDevice: [],
        clicksByCountry: [],
      };
    }

    const totalClicks = events.length;
    const uniqueVisitors = new Set(events.map(e => e.visitor_id)).size;

    // Top products
    const productMap = new Map<string, { clicks: number; visitors: Set<string> }>();
    for (const event of events) {
      const productId = (event.metadata as Record<string, unknown>)?.product_id as string ?? "unknown";
      const existing = productMap.get(productId) ?? { clicks: 0, visitors: new Set() };
      existing.clicks++;
      existing.visitors.add(event.visitor_id);
      productMap.set(productId, existing);
    }
    const topProducts = Array.from(productMap.entries())
      .map(([product_id, data]) => ({
        product_id,
        clicks: data.clicks,
        unique_visitors: data.visitors.size,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Top articles
    const articleMap = new Map<string, { clicks: number; visitors: Set<string> }>();
    for (const event of events) {
      const slug = event.article_slug ?? "unknown";
      const existing = articleMap.get(slug) ?? { clicks: 0, visitors: new Set() };
      existing.clicks++;
      existing.visitors.add(event.visitor_id);
      articleMap.set(slug, existing);
    }
    const topArticles = Array.from(articleMap.entries())
      .map(([article_slug, data]) => ({
        article_slug,
        clicks: data.clicks,
        unique_visitors: data.visitors.size,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    // Get visitor details for device/country stats
    const visitorIds = [...new Set(events.map(e => e.visitor_id))];
    const visitors = await supabaseRequest<Array<{ visitor_id: string; device_type: string; country_code: string }>>(
      `visitors?visitor_id=in.(${visitorIds.map(id => `"${id}"`).join(",")})&select=visitor_id,device_type,country_code`,
      { method: "GET" }
    );

    const visitorMap = new Map((visitors ?? []).map(v => [v.visitor_id, v]));

    // Clicks by device
    const deviceMap = new Map<string, number>();
    for (const event of events) {
      const visitor = visitorMap.get(event.visitor_id);
      const device = visitor?.device_type ?? "unknown";
      deviceMap.set(device, (deviceMap.get(device) ?? 0) + 1);
    }
    const clicksByDevice = Array.from(deviceMap.entries())
      .map(([device_type, count]) => ({ device_type, count }))
      .sort((a, b) => b.count - a.count);

    // Clicks by country
    const countryMap = new Map<string, number>();
    for (const event of events) {
      const visitor = visitorMap.get(event.visitor_id);
      const country = visitor?.country_code ?? "unknown";
      countryMap.set(country, (countryMap.get(country) ?? 0) + 1);
    }
    const clicksByCountry = Array.from(countryMap.entries())
      .map(([country, count]) => ({ country, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalClicks,
      uniqueVisitors,
      topProducts,
      topArticles,
      clicksByDevice,
      clicksByCountry,
    };
  } catch (error) {
    console.error(`Affiliate click stats failed: ${String(error)}`);
    return {
      totalClicks: 0,
      uniqueVisitors: 0,
      topProducts: [],
      topArticles: [],
      clicksByDevice: [],
      clicksByCountry: [],
    };
  }
}
