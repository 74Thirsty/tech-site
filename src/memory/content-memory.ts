import type { MemoryRecord } from "./types";
export function contentMemory(slug:string,topics:string[],format:string):MemoryRecord{return {kind:"CONTENT",key:slug,value:{topics,format},confidence:1,source:"published-content",createdAt:new Date().toISOString()};}
