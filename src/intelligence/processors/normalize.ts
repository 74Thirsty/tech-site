import type { IntelligenceItem } from "@/intelligence/types";
export function normalize(items:IntelligenceItem[]):IntelligenceItem[]{return items.map((item)=>({...item,title:item.title.replace(/\s+/g," ").trim(),summary:item.summary.replace(/\s+/g," ").trim(),topics:item.topics.map((topic)=>topic.toUpperCase())})).filter((item)=>item.title && item.url);}
