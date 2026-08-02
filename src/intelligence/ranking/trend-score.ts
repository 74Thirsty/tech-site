import type { IntelligenceItem } from "@/intelligence/types";
export function trendScore(item:IntelligenceItem){return Math.min(100,Math.round((item.metrics?.score ?? 40) / 10 + 35));}
