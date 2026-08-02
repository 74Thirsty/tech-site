import { supabaseRequest } from "@/lib/supabase";
export async function recordEvent(eventName:string,metadata:Record<string,unknown>={},path?:string){return supabaseRequest("analytics_events",{method:"POST",body:JSON.stringify({event_name:eventName,path:path??null,metadata})});}
