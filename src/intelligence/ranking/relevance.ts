import type { IntelligenceItem } from "@/intelligence/types";
export function relevance(item:IntelligenceItem){return Math.min(100,30 + item.topics.length*12 + (item.source === "NVD / CVE" ? 20 : 0));}
