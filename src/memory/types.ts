export type MemoryKind = "AUDIENCE" | "CONTENT" | "PERFORMANCE" | "DECISION";
export type MemoryRecord = { kind:MemoryKind; key:string; value:Record<string,unknown>; confidence:number; source:string; createdAt:string };
