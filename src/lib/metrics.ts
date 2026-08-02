import { supabaseRequest } from "./supabase";

export async function loadMetrics() {
  const [subscribers, issues] = await Promise.all([
    supabaseRequest<Array<{id:string}>>("subscribers?select=id&status=eq.active"),
    supabaseRequest<Array<{open_rate:number|null;click_rate:number|null;revenue:number|null}>>("newsletter_issues?select=open_rate,click_rate,revenue")
  ]);
  const rows = issues ?? [];
  return {subscribers:subscribers?.length ?? 0,openRate:rows.length ? Math.round(rows.reduce((sum,row) => sum + (row.open_rate ?? 0),0) / rows.length) : 0,clickRate:rows.length ? Math.round(rows.reduce((sum,row) => sum + (row.click_rate ?? 0),0) / rows.length) : 0,revenue:rows.reduce((sum,row) => sum + (row.revenue ?? 0),0)};
}
