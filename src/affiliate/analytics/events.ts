import { supabaseRequest } from "@/lib/supabase";

// ─── Affiliate Analytics Events ──────────────────────────────────────────────
// Records the complete decision chain for every affiliate opportunity.
// Used for debugging, optimization, and performance tracking.

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AffiliateEvent {
  article_slug: string;
  entity: string;
  intent: string;
  queries: string[];
  selected_products: string[]; // ASINs
  relevance_score: number;
  placements: string[];
  timestamp: string;
}

// ─── Event Recording ─────────────────────────────────────────────────────────

export async function recordAffiliateEvent(
  event: Omit<AffiliateEvent, "timestamp">
): Promise<boolean> {
  try {
    await supabaseRequest("affiliate_events", {
      method: "POST",
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
      }),
    });
    return true;
  } catch {
    // Analytics failure never blocks anything
    return false;
  }
}

export async function getAffiliateEvents(
  articleSlug?: string,
  limit = 50
): Promise<AffiliateEvent[]> {
  try {
    const filter = articleSlug
      ? `article_slug=eq.${encodeURIComponent(articleSlug)}&`
      : "";
    return await supabaseRequest<AffiliateEvent[]>(
      `affiliate_events?${filter}select=*&order=timestamp.desc&limit=${limit}`,
      { method: "GET" }
    ) ?? [];
  } catch {
    return [];
  }
}
