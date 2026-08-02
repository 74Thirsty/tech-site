# AGENTS.md

## Canonical Environment Variables

The following list is AUTHORITATIVE. Do not invent new env var names or rename existing ones.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | No | Base URL of the deployed site |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase public/anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role key (server-side only) |
| `RESEND_API_KEY` | No | Resend email service API key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `PEXELS_API_KEY` | No | Pexels image search API key |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook endpoint signing secret |
| `CRON_SECRET` | No | Secret token for `/api/jobs/*` endpoints |
| `DISCORD_WEBHOOK_URL` | No | Discord incoming webhook URL |
| `NEWSLETTER_FROM` | No | Default: `signal@neon-forge.dev` |

### Rules

1. **Never introduce new environment variable names.** If a feature needs config, add it to `env` in `src/lib/env.ts` first, then document it here.
2. **Never rename existing variables.** The code references these names directly — renaming breaks runtime.
3. **Never hardcode secrets** in source. Always read from `process.env` via `env.*`.
4. **All `.env.example` updates must mirror this list.**
5. **Verify with `npx tsc --noEmit`** before completing any task that touches `env.ts` or route handlers.
