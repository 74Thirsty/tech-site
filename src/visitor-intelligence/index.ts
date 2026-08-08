// ─── Visitor Intelligence Module ──────────────────────────────────────────────
// Complete visitor intelligence system for the Tech Site.
// Collects, enriches, persists, and serves visitor data for admin analysis.

export type {
  Visitor,
  VisitorSession,
  VisitorPageView,
  VisitorEvent,
  IpEnrichment,
  VisitorIntelligenceData,
  VisitorTableFilters,
  VisitorTableResult,
  VisitorStats,
} from "./types";

export { collectVisitorData, recordPageView, recordVisitorEvent, generateVisitorId } from "./collector";
export { enrichIp, getEnrichmentForIp } from "./enrichment";
export { getVisitors, getVisitorDetail, getVisitorStats, getVisitorsWhoClickedAffiliate, getAffiliateEventsForVisitor, getAffiliateClickStats } from "./queries";
