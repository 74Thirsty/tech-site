export const env = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  resendApiKey: process.env.RESEND_API_KEY,
  geminiApiKey: process.env.GEMINI_API_KEY,
  puterAuthToken: process.env.PUTER_AUTH_TOKEN,
  pexelsApiKey: process.env.PEXELS_API_KEY,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  cronSecret: process.env.CRON_SECRET,
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
  newsletterFrom: process.env.NEWSLETTER_FROM ?? "signal@neon-forge.dev",
  cryptopanicApiKey: process.env.CRYPTOPANIC_API_KEY,
  newsdataApiKey: process.env.NEWSDATA_API_KEY,
  newsapiKey: process.env.NEWS_API_KEY,

  // Research pipeline config
  researchMaxAgeDays: parseInt(process.env.RESEARCH_MAX_AGE_DAYS ?? "7", 10),
  researchMaxArticlesPerKeyword: parseInt(process.env.RESEARCH_MAX_ARTICLES_PER_KEYWORD ?? "20", 10),
  researchMinSources: parseInt(process.env.RESEARCH_MIN_SOURCES ?? "2", 10),
  researchMinImportance: process.env.RESEARCH_MIN_IMPORTANCE ?? "MEDIUM",
  researchArticlesPerCycle: parseInt(process.env.RESEARCH_ARTICLES_PER_CYCLE ?? "4", 10),
  researchKeywords: process.env.RESEARCH_KEYWORDS ?? "",
};

export function hasSupabase() { return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey); }
