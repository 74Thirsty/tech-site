import type { IntelligenceItem } from "@/intelligence/types";
export function audienceFit(item:IntelligenceItem){const preferred=["SECURITY","LINUX","AI","PROGRAMMING"];return Math.min(100,35 + preferred.filter((topic)=>item.topics.includes(topic)).length*18);}
