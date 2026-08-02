import { env, hasSupabase } from "./env";

export async function supabaseRequest<T>(path:string, options:RequestInit = {}):Promise<T|null> {
  if (!hasSupabase()) return null;
  const response = await fetch(`${env.supabaseUrl}/rest/v1/${path}`, { ...options, headers:{apikey:env.supabaseServiceRoleKey!,Authorization:`Bearer ${env.supabaseServiceRoleKey}`,"Content-Type":"application/json",Prefer:"return=representation",...(options.headers as Record<string,string> | undefined)}, cache:"no-store" });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response.status === 204 ? null : response.json();
}
