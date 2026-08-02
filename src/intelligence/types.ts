export type IntelligenceItem = { id:string; title:string; url:string; source:string; summary:string; topics:string[]; publishedAt:string; metrics?:Record<string,number> };
export type ScoredOpportunity = IntelligenceItem & { scores:{relevance:number;audience:number;timing:number;business:number}; priority:number; recommendation:string };
export type Collector = { name:string; collect():Promise<IntelligenceItem[]> };
