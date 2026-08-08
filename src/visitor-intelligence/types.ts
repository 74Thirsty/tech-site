// ─── Visitor Intelligence Types ────────────────────────────────────────────────

export interface Visitor {
  id: string;
  visitor_id: string;
  fingerprint?: string;
  ip_address?: string;
  isp?: string;
  organization?: string;
  asn?: string;
  network?: string;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  device_type?: string;
  os?: string;
  os_version?: string;
  browser?: string;
  browser_version?: string;
  vendor?: string;
  model?: string;
  screen_width?: number;
  screen_height?: number;
  language?: string;
  locale?: string;
  referrer?: string;
  referrer_domain?: string;
  landing_page?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  first_seen: string;
  last_seen: string;
  visit_count: number;
  page_views: number;
  is_new: boolean;
  created_at: string;
}

export interface VisitorSession {
  id: string;
  visitor_id: string;
  session_id: string;
  ip_address?: string;
  browser_raw?: string;
  device_type?: string;
  os?: string;
  browser?: string;
  country?: string;
  city?: string;
  referrer?: string;
  landing_page?: string;
  started_at: string;
  last_active: string;
  duration: number;
  page_views: number;
  events: number;
  ended: boolean;
}

export interface VisitorPageView {
  id: string;
  visitor_id: string;
  session_id: string;
  path: string;
  title?: string;
  article_slug?: string;
  referrer?: string;
  load_time?: number;
  scroll_depth?: number;
  created_at: string;
}

export interface VisitorEvent {
  id: string;
  visitor_id: string;
  session_id: string;
  event_type: string;
  event_name: string;
  path?: string;
  article_slug?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IpEnrichment {
  id: string;
  ip_address: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isp?: string;
  organization?: string;
  asn?: string;
  network?: string;
  is_vpn: boolean;
  is_proxy: boolean;
  is_tor: boolean;
  enrichment_source: string;
  enriched_at: string;
}

export interface VisitorIntelligenceData {
  visitor: Visitor;
  sessions: VisitorSession[];
  recentPageViews: VisitorPageView[];
  recentEvents: VisitorEvent[];
  enrichment?: IpEnrichment;
}

export interface VisitorTableFilters {
  search?: string;
  country?: string;
  region?: string;
  city?: string;
  device_type?: string;
  os?: string;
  browser?: string;
  isp?: string;
  is_new?: boolean;
  date_from?: string;
  date_to?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface VisitorTableResult {
  visitors: Visitor[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface VisitorStats {
  totalVisitors: number;
  totalSessions: number;
  totalPageViews: number;
  totalEvents: number;
  newVisitors: number;
  returningVisitors: number;
  avgSessionDuration: number;
  avgPageViews: number;
  topCountries: Array<{ country: string; count: number }>;
  topBrowsers: Array<{ browser: string; count: number }>;
  topDevices: Array<{ device_type: string; count: number }>;
  topReferrers: Array<{ referrer_domain: string; count: number }>;
  visitorsByDay: Array<{ date: string; count: number }>;
}
