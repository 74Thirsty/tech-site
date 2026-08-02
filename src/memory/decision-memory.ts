import type { MemoryRecord } from "./types";
export function decisionMemory(decision:string,reasons:string[],outcome?:string):MemoryRecord{return {kind:"DECISION",key:`decision-${Date.now()}`,value:{decision,reasons,outcome:outcome??"pending"},confidence:0.7,source:"human-approved-operator",createdAt:new Date().toISOString()};}
