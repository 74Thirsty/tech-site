# AGENTS.md

Instruction file for OpenCode sessions working on NEON//FORGE.

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
