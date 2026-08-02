import type { MemoryRecord } from "./types";
export function performanceMemory(slug:string,views:number,completionRate:number,conversions:number):MemoryRecord{return {kind:"PERFORMANCE",key:slug,value:{views,completionRate,conversions},confidence:views>100?0.9:0.4,source:"analytics-events",createdAt:new Date().toISOString()};}
