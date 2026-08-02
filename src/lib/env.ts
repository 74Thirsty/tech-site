export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  pexelsApiKey: process.env.PEXELS_API_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  cronSecret: process.env.CRON_SECRET,
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  newsletterFrom: process.env.NEWSLETTER_FROM ?? "signal@neon-forge.dev",
};

export function hasSupabase() { return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey); }
