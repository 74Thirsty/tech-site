import { supabaseRequest } from "@/lib/supabase";
import type { IpEnrichment } from "./types";

// ─── IP Geolocation Enrichment ────────────────────────────────────────────────
// Uses free ip-api.com endpoint (45 req/min free tier).
// Falls back gracefully if provider is down.
// Caches results in Supabase ip_enrichments table.

const IP_API_URL = "http://ip-api.com/json";
const CACHE_TTL_DAYS = 30;

// ─── Provider Response ────────────────────────────────────────────────────────

interface IpApiResponse {
  status: string;
  country?: string;
  countryCode?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  asname?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
}

// ─── Cache Lookup ─────────────────────────────────────────────────────────────

async function getCachedEnrichment(ip: string): Promise<IpEnrichment | null> {
  try {
    const results = await supabaseRequest<IpEnrichment[]>(
      `ip_enrichments?ip_address=eq.${encodeURIComponent(ip)}&select=*&limit=1`,
      { method: "GET" }
    );
    if (!results || results.length === 0) return null;

    const cached = results[0];
    const enrichedAt = new Date(cached.enriched_at).getTime();
    const now = Date.now();
    const days = (now - enrichedAt) / (1000 * 60 * 60 * 24);

    if (days > CACHE_TTL_DAYS) return null;
    return cached;
  } catch {
    return null;
  }
}

// ─── Cache Store ──────────────────────────────────────────────────────────────

async function cacheEnrichment(ip: string, data: IpApiResponse): Promise<void> {
  try {
    await supabaseRequest("ip_enrichments", {
      method: "POST",
      body: JSON.stringify({
        ip_address: ip,
        country: data.country,
        country_code: data.countryCode,
        region: data.regionName,
        city: data.city,
        postal_code: data.zip,
        latitude: data.lat,
        longitude: data.lon,
        timezone: data.timezone,
        isp: data.isp,
        organization: data.org,
        asn: data.as,
        network: data.asname,
        is_vpn: data.proxy ?? false,
        is_proxy: data.proxy ?? false,
        is_tor: false,
        enrichment_source: "ip-api",
        enriched_at: new Date().toISOString(),
      }),
    });
  } catch {
    // Cache write failure is non-critical
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function enrichIp(ip: string): Promise<IpEnrichment | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") return null;

  // Check cache first
  const cached = await getCachedEnrichment(ip);
  if (cached) return cached;

  // Query provider
  try {
    const res = await fetch(`${IP_API_URL}/${ip}?fields=status,country,countryCode,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,mobile,proxy,hosting`, {
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) return null;

    const data: IpApiResponse = await res.json();
    if (data.status !== "success") return null;

    // Cache result
    await cacheEnrichment(ip, data);

    // Return as IpEnrichment
    return {
      id: "",
      ip_address: ip,
      country: data.country,
      country_code: data.countryCode,
      region: data.regionName,
      city: data.city,
      postal_code: data.zip,
      latitude: data.lat,
      longitude: data.lon,
      timezone: data.timezone,
      isp: data.isp,
      organization: data.org,
      asn: data.as,
      network: data.asname,
      is_vpn: data.proxy ?? false,
      is_proxy: data.proxy ?? false,
      is_tor: false,
      enrichment_source: "ip-api",
      enriched_at: new Date().toISOString(),
    };
  } catch {
    // Provider failure — never break the site
    return null;
  }
}

export async function getEnrichmentForIp(ip: string): Promise<IpEnrichment | null> {
  return getCachedEnrichment(ip);
}
