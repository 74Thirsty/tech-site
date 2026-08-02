import { supabaseRequest } from "@/lib/supabase";import type { MemoryRecord } from "./types";
export async function remember(record:MemoryRecord){return supabaseRequest("agent_memory",{method:"POST",body:JSON.stringify({kind:record.kind,memory_key:record.key,value:record.value,confidence:record.confidence,source:record.source,created_at:record.createdAt})});}
export async function recall(kind:MemoryRecord["kind"],limit=20){return supabaseRequest<MemoryRecord[]>(`agent_memory?kind=eq.${kind}&order=created_at.desc&limit=${limit}`);}
