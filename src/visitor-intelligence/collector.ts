import { supabaseRequest } from "@/lib/supabase";
import type { Visitor, VisitorSession, VisitorPageView, VisitorEvent } from "./types";
import { enrichIp } from "./enrichment";

// ─── Visitor Intelligence Collector ───────────────────────────────────────────
// Handles visitor identification, session management, page view recording,
// and event tracking. All operations are non-blocking — failures never
// impact the site experience.

// ─── User Agent Parsing ───────────────────────────────────────────────────────

interface ParsedUA {
  device_type: string;
  os: string;
  os_version: string;
  browser: string;
  browser_version: string;
}

function parseUserAgent(ua: string): ParsedUA {
  const result: ParsedUA = {
    device_type: "desktop",
    os: "unknown",
    os_version: "",
    browser: "unknown",
    browser_version: "",
  };

  if (!ua) return result;

  // Device type
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    result.device_type = /iPad|iPod|Tablet/i.test(ua) ? "tablet" : "mobile";
  }

  // OS
  if (/Windows/i.test(ua)) {
    result.os = "Windows";
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    result.os_version = match?.[1] ?? "";
  } else if (/Mac OS X/i.test(ua)) {
    result.os = "macOS";
    const match = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    result.os_version = (match?.[1] ?? "").replace(/_/g, ".");
  } else if (/Android/i.test(ua)) {
    result.os = "Android";
    const match = ua.match(/Android (\d+[\.\d]*)/);
    result.os_version = match?.[1] ?? "";
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    result.os = "iOS";
    const match = ua.match(/OS (\d+_\d+)/);
    result.os_version = (match?.[1] ?? "").replace("_", ".");
  } else if (/Linux/i.test(ua)) {
    result.os = "Linux";
  } else if (/CrOS/i.test(ua)) {
    result.os = "ChromeOS";
  }

  // Browser
  if (/Edge|Edg\//i.test(ua)) {
    result.browser = "Edge";
    const match = ua.match(/(?:Edge|Edg\/)(\d+[\.\d]*)/);
    result.browser_version = match?.[1] ?? "";
  } else if (/Chrome/i.test(ua) && !/Edg\//i.test(ua)) {
    result.browser = "Chrome";
    const match = ua.match(/Chrome\/(\d+[\.\d]*)/);
    result.browser_version = match?.[1] ?? "";
  } else if (/Firefox/i.test(ua)) {
    result.browser = "Firefox";
    const match = ua.match(/Firefox\/(\d+[\.\d]*)/);
    result.browser_version = match?.[1] ?? "";
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    result.browser = "Safari";
    const match = ua.match(/Version\/(\d+[\.\d]*)/);
    result.browser_version = match?.[1] ?? "";
  } else if (/OPR|Opera/i.test(ua)) {
    result.browser = "Opera";
    const match = ua.match(/(?:OPR|Opera\/)(\d+[\.\d]*)/);
    result.browser_version = match?.[1] ?? "";
  }

  return result;
}

// ─── Visitor ID Generation ────────────────────────────────────────────────────

export function generateVisitorId(ip: string, userAgent: string): string {
  // Simple hash of IP + UA for consistent identification
  const input = `${ip}|${userAgent}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `v_${Math.abs(hash).toString(36)}`;
}

function generateSessionId(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Extract Client Info ──────────────────────────────────────────────────────

function extractClientInfo(request: Request): {
  ip: string;
  userAgent: string;
  referrer: string;
  language: string;
  acceptLanguage: string;
} {
  const headers = request.headers;
  return {
    ip: headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? headers.get("x-real-ip")
      ?? headers.get("cf-connecting-ip")
      ?? "unknown",
    userAgent: headers.get("user-agent") ?? "",
    referrer: headers.get("referer") ?? headers.get("referrer") ?? "",
    language: headers.get("accept-language")?.split(",")[0]?.split(";")[0]?.trim() ?? "",
    acceptLanguage: headers.get("accept-language") ?? "",
  };
}

function extractUtmParams(url: string): { utm_source?: string; utm_medium?: string; utm_campaign?: string } {
  try {
    const parsed = new URL(url, "http://localhost");
    return {
      utm_source: parsed.searchParams.get("utm_source") ?? undefined,
      utm_medium: parsed.searchParams.get("utm_medium") ?? undefined,
      utm_campaign: parsed.searchParams.get("utm_campaign") ?? undefined,
    };
  } catch {
    return {};
  }
}

// ─── Visitor Operations ──────────────────────────────────────────────────────

async function getOrCreateVisitor(
  visitorId: string,
  request: Request,
  clientInfo: ReturnType<typeof extractClientInfo>
): Promise<Visitor | null> {
  try {
    // Try to get existing visitor
    const existing = await supabaseRequest<Visitor[]>(
      `visitors?visitor_id=eq.${encodeURIComponent(visitorId)}&select=*&limit=1`,
      { method: "GET" }
    );

    if (existing && existing.length > 0) {
      // Update last_seen, visit_count, and IP if changed
      const visitor = existing[0];
      const ipChanged = clientInfo.ip !== "unknown" && visitor.ip_address !== clientInfo.ip;
      await supabaseRequest(`visitors?visitor_id=eq.${encodeURIComponent(visitorId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          last_seen: new Date().toISOString(),
          visit_count: visitor.visit_count + 1,
          is_new: false,
          ...(ipChanged ? { ip_address: clientInfo.ip } : {}),
        }),
      });
      return { ...visitor, last_seen: new Date().toISOString(), visit_count: visitor.visit_count + 1, ...(ipChanged ? { ip_address: clientInfo.ip } : {}) };
    }

    // Create new visitor
    const parsed = parseUserAgent(clientInfo.userAgent);
    const url = new URL(request.url, "http://localhost");
    const utmParams = extractUtmParams(request.url);
    const referrerDomain = clientInfo.referrer ? new URL(clientInfo.referrer).hostname : null;

    const newVisitor: Record<string, unknown> = {
      visitor_id: visitorId,
      ip_address: clientInfo.ip,
      device_type: parsed.device_type,
      os: parsed.os,
      os_version: parsed.os_version,
      browser: parsed.browser,
      browser_version: parsed.browser_version,
      language: clientInfo.language,
      locale: clientInfo.acceptLanguage,
      referrer: clientInfo.referrer || null,
      referrer_domain: referrerDomain,
      landing_page: url.pathname,
      ...utmParams,
      first_seen: new Date().toISOString(),
      last_seen: new Date().toISOString(),
      visit_count: 1,
      page_views: 0,
      is_new: true,
    };

    const results = await supabaseRequest<Visitor[]>("visitors", {
      method: "POST",
      body: JSON.stringify(newVisitor),
      headers: { Prefer: "return=representation" },
    });

    // Enrich IP asynchronously (don't block)
    if (clientInfo.ip && clientInfo.ip !== "unknown") {
      enrichIp(clientInfo.ip).then(enrichment => {
        if (enrichment) {
          supabaseRequest(`visitors?visitor_id=eq.${encodeURIComponent(visitorId)}`, {
            method: "PATCH",
            body: JSON.stringify({
              country: enrichment.country,
              country_code: enrichment.country_code,
              region: enrichment.region,
              city: enrichment.city,
              postal_code: enrichment.postal_code,
              latitude: enrichment.latitude,
              longitude: enrichment.longitude,
              timezone: enrichment.timezone,
              isp: enrichment.isp,
              organization: enrichment.organization,
              asn: enrichment.asn,
              network: enrichment.network,
              is_vpn: enrichment.is_vpn,
              is_proxy: enrichment.is_proxy,
              is_tor: enrichment.is_tor,
            }),
          }).catch(() => {});
        }
      }).catch(() => {});
    }

    return results?.[0] ?? null;
  } catch (error) {
    console.error(`Visitor creation failed: ${String(error)}`);
    return null;
  }
}

async function getOrCreateSession(
  visitorId: string,
  sessionId: string | null,
  request: Request,
  clientInfo: ReturnType<typeof extractClientInfo>
): Promise<VisitorSession | null> {
  try {
    // If we have a session ID, try to extend it
    if (sessionId) {
      const existing = await supabaseRequest<VisitorSession[]>(
        `visitor_sessions?session_id=eq.${encodeURIComponent(sessionId)}&select=*&limit=1`,
        { method: "GET" }
      );

      if (existing && existing.length > 0) {
        const session = existing[0];
        const lastActive = new Date(session.last_active).getTime();
        const now = Date.now();
        const inactiveMinutes = (now - lastActive) / (1000 * 60);

        // If inactive for >30 minutes, create new session
        if (inactiveMinutes < 30) {
          await supabaseRequest(`visitor_sessions?session_id=eq.${encodeURIComponent(sessionId)}`, {
            method: "PATCH",
            body: JSON.stringify({
              last_active: new Date().toISOString(),
              duration: Math.floor((now - new Date(session.started_at).getTime()) / 1000),
              page_views: session.page_views + 1,
            }),
          });
          return { ...session, last_active: new Date().toISOString(), page_views: session.page_views + 1 };
        }
      }
    }

    // Create new session
    const parsed = parseUserAgent(clientInfo.userAgent);
    const url = new URL(request.url, "http://localhost");
    const newSessionId = generateSessionId();

    const newSession: Record<string, unknown> = {
      visitor_id: visitorId,
      session_id: newSessionId,
      ip_address: clientInfo.ip,
      browser_raw: clientInfo.userAgent,
      device_type: parsed.device_type,
      os: parsed.os,
      browser: parsed.browser,
      referrer: clientInfo.referrer || null,
      landing_page: url.pathname,
      started_at: new Date().toISOString(),
      last_active: new Date().toISOString(),
      duration: 0,
      page_views: 1,
      events: 0,
      ended: false,
    };

    const results = await supabaseRequest<VisitorSession[]>("visitor_sessions", {
      method: "POST",
      body: JSON.stringify(newSession),
      headers: { Prefer: "return=representation" },
    });

    return results?.[0] ?? null;
  } catch (error) {
    console.error(`Session creation failed: ${String(error)}`);
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface CollectResult {
  visitor: Visitor | null;
  session: VisitorSession | null;
  visitorId: string;
  sessionId: string;
}

export async function collectVisitorData(
  request: Request,
  options: { sessionId?: string; path?: string } = {}
): Promise<CollectResult> {
  const clientInfo = extractClientInfo(request);
  const visitorId = generateVisitorId(clientInfo.ip, clientInfo.userAgent);
  const sessionId = options.sessionId ?? null;

  // Must run sequentially — session FK references visitors
  const visitor = await getOrCreateVisitor(visitorId, request, clientInfo);
  const session = await getOrCreateSession(visitorId, sessionId, request, clientInfo);

  return {
    visitor,
    session,
    visitorId,
    sessionId: session?.session_id ?? "",
  };
}

export async function recordPageView(
  visitorId: string,
  sessionId: string,
  path: string,
  options: { title?: string; articleSlug?: string; referrer?: string; loadTime?: number } = {}
): Promise<void> {
  try {
    // Record page view
    const pageView: Record<string, unknown> = {
      visitor_id: visitorId,
      session_id: sessionId,
      path,
      title: options.title ?? null,
      article_slug: options.articleSlug ?? null,
      referrer: options.referrer ?? null,
      load_time: options.loadTime ?? null,
      created_at: new Date().toISOString(),
    };

    await supabaseRequest("visitor_page_views", {
      method: "POST",
      body: JSON.stringify(pageView),
    });

    // Update visitor last_seen
    await supabaseRequest(`visitors?visitor_id=eq.${encodeURIComponent(visitorId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        last_seen: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch (error) {
    console.error(`Page view recording failed: ${String(error)}`);
  }
}

export async function recordVisitorEvent(
  visitorId: string,
  sessionId: string,
  eventType: string,
  eventName: string,
  options: { path?: string; articleSlug?: string; metadata?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    const event: Record<string, unknown> = {
      visitor_id: visitorId,
      session_id: sessionId,
      event_type: eventType,
      event_name: eventName,
      path: options.path ?? null,
      article_slug: options.articleSlug ?? null,
      metadata: options.metadata ?? {},
      created_at: new Date().toISOString(),
    };

    await supabaseRequest("visitor_events", {
      method: "POST",
      body: JSON.stringify(event),
    });

    // Update session last_active
    await supabaseRequest(`visitor_sessions?session_id=eq.${encodeURIComponent(sessionId)}`, {
      method: "PATCH",
      body: JSON.stringify({
        last_active: new Date().toISOString(),
      }),
    }).catch(() => {});
  } catch (error) {
    console.error(`Event recording failed: ${String(error)}`);
  }
}
