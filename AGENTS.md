# AGENTS.md

Instruction file for OpenCode sessions working on NEON//FORGE.

## Status of Progress

**Last updated**: 2026-08-02

### Deployment

- **Platform**: Vercel (serverless)
- **Production URL**: https://stratagemconsulting.net
- **Vercel project**: `stratagem1/arcade-site`
- **Deploy command**: `vercel --prod --yes`
- **No git remote** — all deploys via Vercel CLI directly
- **All 13 env vars are set in Vercel** (confirmed via `vercel env ls`)

### What Works

- Static pages: `/`, `/vault`, `/vault/[slug]`, `/projects`, `/newsletter`, `/books`, `/events`, `/podcast`
- Article rendering: title, author byline ("by c. e. hirschauer"), hero image, mermaid chart, second image, animated SVG footer with donate button
- API routes: `/api/status`, `/api/search` (public)
- Vercel cron: `/api/jobs/research` runs weekly (Monday 1PM)
- Stripe webhooks: `/api/webhooks/stripe` (functional)
- Build passes: `npx tsc --noEmit` clean, `next build` succeeds

### What's Broken (as of 2026-08-02)

1. **Auth on Vercel is BROKEN** — The login page (`/login`) checks `result.ok` in the response, but Supabase auth responses do NOT have an `ok` field. They return `{ access_token, user, ... }` on success or `{ error, msg, ... }` on failure. So even when Supabase auth succeeds, the login page falls through to "Transmission failed." The `router.push("/control")` never fires.
   - **Root cause**: Login page at `src/app/login/page.tsx:29` checks `response.ok && result.ok` — `result.ok` is always `undefined` for Supabase responses.
   - **Fix needed**: Change the success check to `response.ok` only (Supabase returns 200 on success, 400/401 on failure). Or check for `result.access_token` instead.
   - **NOTE**: Local auth (`data/users.json`) is NOT available on Vercel — filesystem is read-only in serverless. Supabase auth is the ONLY auth path in production.

2. **Admin panel inaccessible** — `/control` is protected by middleware. Without working auth, nobody can log in to access it.

3. **Article generation endpoint** — `/api/articles/generate` exists and is protected by auth. Cannot be tested until auth is fixed.

4. **Research job** — `/api/jobs/research` runs on Vercel cron but results aren't visible until auth works (to see control center).

### Previous Changes (this session)

- Added author byline "by c. e. hirschauer" to `src/app/vault/[slug]/page.tsx`
- Added redirect to `/control` after successful auth in `src/app/login/page.tsx` (uses `next/navigation` `useRouter`)
- Added error handling (try/catch) to `src/app/api/auth/route.ts` for local auth failures
- Committed and deployed: `git commit -m "fix: login redirect to /control after auth, add author byline to articles"`

### Key Architectural Facts

- Next.js 14.2.31 with App Router, TypeScript strict mode
- Dual auth: local (scrypt+salt, `data/users.json`) for dev, Supabase for production
- All API routes use `requireAuth()` from `src/lib/auth.ts` — checks `nf_session` cookie OR `nf_access_token` cookie OR `CRON_SECRET` header
- Middleware at `src/middleware.ts` protects `/control` and 7 API routes
- Content lives in `src/content/*.json` — static JSON files bundled at build time
- Article body generation: `src/articles/generator.ts` (1125 lines, hard-coded content per slug)
- Intelligence pipeline: 6 collectors (GitHub, HN, CVE, crypto, arxiv, RSS) → normalize → deduplicate → classify → rank
- Gemini used for SEO analysis only (`src/seo/ml-optimizer.ts`)
- No git remote configured — all deploys via `vercel --prod --yes`

## Environment Variables

The canonical list is AUTHORITATIVE. Do not invent new env var names or rename existing ones.

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

1. **Never introduce new env var names.** Add to `src/lib/env.ts` first, then document here.
2. **Never rename existing variables.** Code references these names directly.
3. **Never hardcode secrets** in source. Read from `process.env` via `env.*`.
4. **`.env.example` must mirror this list.**
5. **Verify with `npx tsc --noEmit`** before completing any task that touches `env.ts` or route handlers.

### Secrets Management

- `load-env.sh` loads secrets from KDE Wallet before dev server starts
- `store-env.sh` prompts for and stores secrets into KDE Wallet
- `.env.local` is gitignored; production secrets live on Vercel
- `CRON_SECRET` is used on Vercel for scheduled jobs + programmatic API access

## Development Commands

```bash
# Standard local dev
npm run dev

# Load secrets from KDE Wallet first, then start dev server
npm run dev:secure

# Type check (required before finishing any env.ts or route handler change)
npx tsc --noEmit

# Lint
npx next lint

# Build for production
npm run build && npm start

# Fetch Pexels images for all articles missing them
npm run generate-images
```

## Auth & Security

- **Login**: `/login` — signup/login form. Local auth uses scrypt+salt (`data/users.json`). Supabase auth when `NEXT_PUBLIC_SUPABASE_URL` is set.
- **Session cookies**: `nf_session` (local), `nf_access_token` (Supabase)
- **Protected routes**: `/control` and 7 admin API routes (`/api/control`, `/api/articles/generate`, `/api/agents`, `/api/operator`, `/api/images/search`, `/api/images/generate`, `/api/seo`) are guarded by `src/middleware.ts` + inline `requireAuth()` calls. Unauthenticated page access redirects to `/login`. Unauthenticated API access returns 401.
- **Cron/programmatic access**: Pass `Authorization: Bearer <CRON_SECRET>` or `X-Cron-Secret` header.
- **No admin login on home page** — CONTROL links were intentionally removed from `src/app/page.tsx`.
- **Password hashing**: `crypto.scrypt` with random salt in `src/lib/local-auth.ts`. Legacy SHA-256 hashes auto-migrate on successful login.
- **CRITICAL: Local auth does NOT work on Vercel** — filesystem is read-only in serverless. Supabase is the ONLY auth path in production. The auth route at `src/app/api/auth/route.ts` checks `env.supabaseUrl` — if set, it uses Supabase; if not set, it falls back to local auth (which will fail on Vercel).

## Content Templates

### Articles
- `src/editorial/formatter.ts` — `formatArticleBody(data: ArticleTemplateData)` renders HTML following the standard arc: intro → THE DEEP DIVE → PRINCIPLES → IN PRACTICE → LIVE SIGNALS → ANTIPATTERNS → CHECKLIST → YOUR MOVE
- `src/articles/generator.ts` — `generateAllArticles()` / `generateArticleBySlug(slug)` regenerate `src/content/articles.json` body content
- Article JSON lives in `src/content/articles.json`

### Article Page Layout (`/vault/[slug]`)
- `src/app/vault/[slug]/page.tsx` — Splits body HTML into thirds and inserts:
  1. Hero image (Pexels, category-themed) below title/excerpt
  2. Mermaid diagram at ~33% (category-specific charts)
  3. Second image (Pexels, tag-themed) at ~66%
  4. Animated SVG footer banner with social links + donate button
- `src/components/MermaidDiagram.tsx` — Client component, renders mermaid.js with dark theme
- `src/components/ArticleImage.tsx` — Pexels image wrapper with photographer attribution
- `src/components/ArticleFooter.tsx` — Animated SVG banner (glow effect, scan line)
- `src/lib/charts.ts` — Category → mermaid diagram mapping (BLOCKCHAIN=graph, SECURITY=flowchart, AI=sequence, LINUX=architecture, SYSTEMS=flowchart, PRIVACY=sequence)

### Newsletter
- `src/newsletter/templates.ts` — `renderNewsletterHtml(subject, sections, opts)` renders full HTML email with inline CSS (email-client compatible)
- `src/newsletter/assembler.ts` — `assembleNewsletter(plan: ArticlePlan)` produces `NewsletterSection[]`
- `src/newsletter/delivery.ts` — `deliverNewsletter(to, subject, content)` accepts either HTML string or sections array
- Subscription confirmation: `src/lib/resend.ts` uses newsletter template for welcome email
