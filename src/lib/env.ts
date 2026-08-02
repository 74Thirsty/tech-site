export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  pexelsApiKey: process.env.PEXELS_API_KEY,
  newsletterFrom: process.env.NEWSLETTER_FROM ?? "signal@neon-forge.dev",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

export function hasSupabase() { return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey); }
