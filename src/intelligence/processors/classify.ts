import type { IntelligenceItem } from "@/intelligence/types";
const taxonomy=["SECURITY","AI","LINUX","BLOCKCHAIN","PROGRAMMING","HARDWARE","NETWORKING"];
export function classify(items:IntelligenceItem[]){return items.map((item)=>({...item,topics:Array.from(new Set(item.topics.concat(taxonomy.filter((topic)=>`${item.title} ${item.summary}`.toUpperCase().includes(topic)))))}));}
