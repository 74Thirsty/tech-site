# Stratagem Admin Guide

Complete reference for managing the Crystal // Forge platform.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Control Center](#control-center)
3. [Pages & Routes](#pages--routes)
4. [Article Management](#article-management)
5. [Newsletter Operations](#newsletter-operations)
6. [Research Pipeline](#research-pipeline)
7. [Content Calendar](#content-calendar)
8. [User Management & Auth](#user-management--auth)
9. [Analytics & Metrics](#analytics--metrics)
10. [SEO Management](#seo-management)
11. [Image Generation](#image-generation)
12. [Agent System](#agent-system)
13. [Operator & Recommendations](#operator--recommendations)
14. [Revenue Intelligence](#revenue-intelligence)
15. [Memory System](#memory-system)
16. [Distribution](#distribution)
17. [Payments (Stripe)](#payments-stripe)
18. [Environment Variables](#environment-variables)
19. [Database Schema](#database-schema)
20. [API Reference](#api-reference)
21. [Troubleshooting](#troubleshooting)
22. [File Reference](#file-reference)

---

## Quick Start

```bash
# Standard dev
npm run dev

# Dev with secrets loaded from KDE Wallet
npm run dev:secure

# Production build
npm run build && npm start

# Lint
npx next lint

# Type check
npx tsc --noEmit

# Generate Pexels images for articles
npm run generate-images
```

Without any external services configured, the app runs locally with data in JSON files. All integrations report as unconfigured rather than fabricating data.

---

## Control Center

Access at `/control` (protected — redirects to `/login` if unauthenticated).

### Dashboard Metrics

| Metric | Description |
|--------|-------------|
| ARTICLES | Total articles in the vault |
| PROJECTS | Total projects in the war room |
| BOOKS | Total books and field guides |
| LAST RESEARCH | Timestamp of last research run |

### Actions

| Button | Action | Description |
|--------|--------|-------------|
| `Run research →` | `research` | Triggers intelligence collectors to gather new opportunities |
| `Generate articles →` | `generate-all` | Generates content for all articles |
| `Generate newsletter →` | `generate` | Creates a newsletter draft from current content |

### Queue Management

The review queue shows pending items awaiting approval:

- **NEEDS_REVIEW**: Item needs human approval
- **APPROVED**: Item has been approved for publication

Click `APPROVE ↗` on any item to approve it.

### Timeline

The timeline shows recent system actions and their results.

---

## Pages & Routes

### Public Pages

| Route | File | Type | Description |
|-------|------|------|-------------|
| `/` | `src/app/page.tsx` | Client | Homepage — CRT toggle, hero, directory cards, latest articles, active projects, footer |
| `/vault` | `src/app/vault/page.tsx` | Server | Article listing with category, difficulty, XP |
| `/vault/[slug]` | `src/app/vault/[slug]/page.tsx` | SSG | Individual article view with `generateStaticParams` |
| `/projects` | `src/app/projects/page.tsx` | Server | "War Room" — 14 projects with architecture steps, tech stacks, status |
| `/books` | `src/app/books/page.tsx` | Server | 3 books/field guides with cover art and CTAs |
| `/newsletter` | `src/app/newsletter/page.tsx` | Client | "The Signal" signup form + podcast episode listing with Listen links to `/podcast#ep-{number}` |
| `/podcast` | `src/app/podcast/page.tsx` | Server | Podcast episodes listing with deep-link anchors (`#ep-001`, etc.) |
| `/events` | `src/app/events/page.tsx` | Server | 3 upcoming events with registration buttons |
| `/control` | `src/app/control/page.tsx` | Client | **Protected** admin dashboard |
| `/login` | `src/app/login/page.tsx` | Client | Login/signup form |

### API Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth` | POST | None | Login/signup (local scrypt or Supabase Auth) |
| `/api/status` | GET | None | Integration status check |
| `/api/newsletter` | POST | None | Subscribe to newsletter or generate issue |
| `/api/analytics` | POST | None | Record analytics event to Supabase |
| `/api/search` | GET | None | Search articles, projects, books |
| `/api/checkout` | POST | None | Create Stripe checkout session |
| `/api/webhooks/stripe` | POST | Stripe sig | Stripe webhook handler (6 event types) |
| `/api/control` | GET/POST | **Protected** | Control center state and actions |
| `/api/articles/generate` | POST | **Protected** | Generate article content (single or all) |
| `/api/agents` | POST | **Protected** | Run all 4 content agents in sequence |
| `/api/operator` | POST | **Protected** | Get today's recommendation based on audience profile |
| `/api/images/search` | POST | **Protected** | Search Pexels for images |
| `/api/images/generate` | POST | **Protected** | Auto-generate hero images for articles |
| `/api/seo` | POST | **Protected** | Gemini-powered SEO analysis |
| `/api/jobs/research` | GET/POST | CRON_SECRET | Scheduled research job (Vercel cron: Monday 13:00 UTC) |

---

## Article Management

### Article Structure

Articles are stored in `src/content/articles.json`:

```json
{
  "slug": "unique-identifier",
  "title": "Article Title",
  "category": "BLOCKCHAIN|SECURITY|LINUX|AI|SYSTEMS|PRIVACY",
  "difficulty": "BEGINNER|INTERMEDIATE|ADVANCED",
  "readTime": "10 MIN",
  "xp": 200,
  "excerpt": "Short description",
  "tags": ["TAG1", "TAG2"],
  "body": "<h2>HTML content</h2>",
  "heroImage": "https://images.pexels.com/..."
}
```

### Article Page Layout

Articles at `/vault/[slug]` render with a rich visual layout:

1. **Hero image** — Pexels image matched to article category, displayed below title/excerpt
2. **Mermaid diagram** — Category-specific chart inserted at ~33% of body content
   - BLOCKCHAIN: Token flow graph
   - SECURITY: Attack vector flowchart
   - AI: Agent interaction sequence diagram
   - LINUX: System architecture diagram
   - SYSTEMS: Data pipeline flowchart
   - PRIVACY: Encrypted handshake sequence
3. **Second image** — Pexels image matched to article tags, at ~66%
4. **Footer banner** — Animated SVG with glowing Crystal // Forge logo, social links (GitHub, X, LinkedIn, Discord), and donate button

#### Layout Components

| Component | File | Description |
|-----------|------|-------------|
| MermaidDiagram | `src/components/MermaidDiagram.tsx` | Client component, renders mermaid.js with dark theme |
| ArticleImage | `src/components/ArticleImage.tsx` | Pexels image wrapper with photographer attribution |
| ArticleFooter | `src/components/ArticleFooter.tsx` | Animated SVG banner with glow effect and scan line |
| Charts | `src/lib/charts.ts` | Category → mermaid diagram mapping |

#### How Body Splitting Works

The page splits `article.body` HTML by counting block-level tags (`<h2>`, `<h3>`, `<p>`, `<pre>`, `<ul>`, `<ol>`, `<blockquote>`). It divides at 1/3 and 2/3 of these tags to insert the mermaid chart and second image at natural content breaks.

### Generating Content

#### Via Control Center

1. Navigate to `/control`
2. Click "Generate articles →"
3. Wait for completion (processes ~1 article per 2 seconds)
4. Check timeline for results

#### Via API

```bash
# Generate all articles
curl -X POST http://localhost:3000/api/articles/generate \
  -H "Content-Type: application/json" \
  -d '{"action":"generate-all"}'

# Generate single article
curl -X POST http://localhost:3000/api/articles/generate \
  -H "Content-Type: application/json" \
  -d '{"slug":"flash-loan-architecture"}'
```

#### Response Format

```json
{
  "success": true,
  "generated": 16,
  "failed": 0,
  "results": [
    {"slug": "graph-arbitrage", "success": true},
    {"slug": "atomic-execution", "success": true}
  ]
}
```

### Adding New Articles

1. Open `src/content/articles.json`
2. Add a new object to the array:

```json
{
  "slug": "my-new-article",
  "title": "My New Article Title",
  "category": "BLOCKCHAIN",
  "difficulty": "INTERMEDIATE",
  "readTime": "10 MIN",
  "xp": 200,
  "excerpt": "Brief description of the article.",
  "tags": ["BLOCKCHAIN", "DEFI"],
  "body": ""
}
```

3. Generate content via Control Center or API
4. Rebuild the site: `npm run build`

### Article Categories

| Category | Topics |
|----------|--------|
| BLOCKCHAIN | DeFi, smart contracts, arbitrage, MEV, flash loans |
| SECURITY | Hardening, threat modeling, recon, OSINT |
| LINUX | System administration, packaging, networking |
| AI | Agents, automation, architecture |
| SYSTEMS | Infrastructure, monitoring, boring tech |
| PRIVACY | DNS, encryption, opsec |

### Difficulty Levels

| Level | Description | XP Range |
|-------|-------------|----------|
| BEGINNER | Accessible to newcomers | 100-150 |
| INTERMEDIATE | Requires some experience | 170-230 |
| ADVANCED | Deep technical content | 250-320 |

### Content Focus: Crypto Drops

Articles about blockchain/DeFi topics should frame price drops as:

- **Buying opportunities** for long-term believers
- **Market corrections** that healthy markets need
- **Accumulation phases** where strong hands buy from weak hands
- **Builder moments** to focus on development, not speculation
- **Discount events** for quality assets

Example framing:
> "When ETH dropped 40%, it wasn't a crisis—it was a clearance sale on the world's most important programmable blockchain."

---

## Newsletter Operations

### The Signal

The weekly newsletter dispatches to subscribers.

### Generating a Newsletter

1. Go to `/control`
2. Click "Generate newsletter →"
3. Review the draft in the queue
4. Click "Approve →" to send

### Manual Newsletter Generation

```bash
curl -X POST http://localhost:3000/api/newsletter \
  -H "Content-Type: application/json" \
  -d '{"action":"generate"}'
```

### Subscriber Management

Subscribers are stored in Supabase `subscribers` table:

| Field | Type | Description |
|-------|------|-------------|
| email | string | Subscriber email |
| source | string | `newsletter`, `book`, or `mission` |
| created_at | timestamp | Subscription date |
| status | string | `active` or `unsubscribed` |

### Email Delivery

Emails are sent via Resend. Configure `RESEND_API_KEY` in `.env.local`.

From address: `signal@neon-forge.dev` (configurable via `NEWSLETTER_FROM`)

### Newsletter Template

The newsletter uses a dark-themed HTML email template with inline CSS (email-client compatible):

- Background: `#0a0a0d`
- Accent: `#00ff88`
- Sections: THE SIGNAL, THE PATCH, THE UPGRADE
- Supports preheader text and unsubscribe links

### Podcast Page

`/podcast` renders all episodes from `src/content/podcast.json`. Each episode card has:

- Episode number, title, date, duration
- Summary text
- Anchor `id="ep-{number}"` for deep-linking from the newsletter page

"Listen" links on `/newsletter` point to `/podcast#ep-{number}` to land on the specific episode.

"Read the archive" link on `/newsletter` points to `/vault`.

---

## Research Pipeline

### Intelligence Collectors

The research system gathers signals from multiple sources:

| Collector | Source | Data |
|-----------|--------|------|
| GitHub | GitHub API | Trending repositories (stars > 1000) |
| Hacker News | Firebase API | Top stories |
| CVE | NVD API | Recent vulnerabilities |
| Crypto | CoinGecko | Trending coins |
| RSS | Custom feeds | Configurable feeds |
| arXiv | arXiv RSS | AI papers |

### Running Research

#### Via Control Center

Click "Run research →" on the dashboard.

#### Via API

```bash
curl -X POST http://localhost:3000/api/control \
  -H "Content-Type: application/json" \
  -d '{"action":"research"}'
```

#### Via Cron Job

Configure in `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/jobs/research",
    "schedule": "0 9 * * 1"
  }]
}
```

Set `CRON_SECRET` in environment for authentication.

### Pipeline Processing

1. **Collection**: Gather raw items from all collectors in parallel
2. **Normalization**: Standardize format and fields
3. **Deduplication**: Remove duplicate items
4. **Classification**: Auto-tag with taxonomy (SECURITY, AI, LINUX, BLOCKCHAIN, PROGRAMMING, HARDWARE, NETWORKING)
5. **Ranking**: Score by relevance, audience fit, and trend signals

### Topic Taxonomy

| Tag | Topics |
|-----|--------|
| SECURITY | CVE, vulnerability, exploit, hardening |
| AI | agent, model, LLM, neural, transformer |
| LINUX | kernel, systemd, container, docker |
| BLOCKCHAIN | blockchain, defi, smart contract, MEV |
| PROGRAMMING | language, compiler, runtime, framework |
| HARDWARE | chip, GPU, CPU, FPGA, sensor |
| NETWORKING | protocol, DNS, CDN, routing |

---

## Content Calendar

### Planning

The calendar system generates editorial plans based on audience profiles.

```bash
curl -X POST http://localhost:3000/api/operator \
  -H "Content-Type: application/json" \
  -d '{"topics":["BLOCKCHAIN","SECURITY"]}'
```

Returns recommended content for the current period plus a 1-week calendar.

### Content Types

| Type | Frequency | Description |
|------|-----------|-------------|
| ARTICLE | Weekly | Technical field notes |
| TUTORIAL | Weekly | Hands-on mission guides |
| NEWSLETTER | Weekly | The Signal dispatch |
| PODCAST | Weekly | The Signal Room episodes |

### Mission Tracks

| Track | Steps | Reward | XP |
|-------|-------|--------|-----|
| BLOCKCHAIN | 4 steps | CHAIN ENGINEER | 650 |
| SECURITY | 4 steps | THREAT ANALYST | 600 |
| LINUX | 4 steps | SYSTEMS OPERATOR | 500 |
| AI | 4 steps | AGENT BUILDER | 550 |

---

## User Management & Auth

### Authentication Methods

#### Local Authentication

When Supabase is not configured, users are stored locally in `data/users.json`:

```json
[
  {
    "username": "admin",
    "email": "admin@example.com",
    "passwordHash": "scrypt-salted-hash",
    "salt": "random-salt"
  }
]
```

Password hashing: `crypto.scrypt` with random salt (N=16384, r=8, p=1). Legacy SHA-256 hashes auto-migrate on successful login.

#### Supabase Authentication

When configured, users are managed through Supabase Auth.

### Creating Users

#### Via Login Page

1. Navigate to `/login`
2. Click "Create account"
3. Enter email and password
4. Account is created

#### Via API

```bash
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"action":"signup","email":"user@example.com","password":"securepassword","username":"username"}'
```

### Session Management

- **Session cookie**: `nf_session` (HMAC-SHA256 signed, 8-hour expiry)
- **Supabase token**: `nf_access_token` (fallback when Supabase is configured)
- **Signing secret**: Derived from `SUPABASE_SERVICE_ROLE_KEY` > `GEMINI_API_KEY` > `CRON_SECRET` > dev fallback

### Protected Routes

#### Pages (redirect to `/login`)

- `/control`

#### API Routes (return 401)

- `/api/control`
- `/api/articles/generate`
- `/api/agents`
- `/api/operator`
- `/api/images/search`
- `/api/images/generate`
- `/api/seo`

#### Cron/Programmatic Access

Pass `Authorization: Bearer <CRON_SECRET>` or `X-Cron-Secret` header to access protected endpoints.

### User Roles

Currently, all authenticated users have full admin access. Role-based access control is planned for a future release.

---

## Analytics & Metrics

### Event Tracking

Analytics events are tracked via `/api/analytics`:

```json
{
  "eventName": "article_view",
  "path": "/vault/flash-loan-architecture",
  "articleSlug": "flash-loan-architecture",
  "metadata": {}
}
```

### Event Types

| Event | Description |
|-------|-------------|
| `page_view` | Page visited |
| `article_view` | Article opened |
| `newsletter_subscribe` | New subscriber |
| `checkout_start` | Payment initiated |
| `checkout_complete` | Payment completed |

### Analytics Pipeline

- **Collector**: `src/analytics/collector.ts` — writes events to Supabase `analytics_events`
- **Analyzer**: `src/analytics/analyzer.ts` — scores topics by views (40%), completion (40%), conversions (20%)
- **Recommendations**: `src/analytics/recommendations.ts` — finds strongest audience signal
- **Reports**: `src/analytics/reports.ts` — combines ranking + insight + timestamp

### Metrics Dashboard

Metrics are available through the control center:

- Total subscribers
- Total newsletter issues sent
- Revenue by content
- Conversion rates

---

## SEO Management

### Optimizing Content

```bash
curl -X POST http://localhost:3000/api/seo \
  -H "Content-Type: application/json" \
  -d '{"title":"Article Title","summary":"Article summary","topics":["BLOCKCHAIN","DEFI"]}'
```

### SEO Modules

| Module | File | Description |
|--------|------|-------------|
| Rule-based | `src/seo/optimizer.ts` | Pattern matching and keyword analysis |
| Gemini AI | `src/seo/ml-optimizer.ts` | AI-powered keyword extraction, scoring, meta descriptions |
| Recommendations | `src/seo/recommendations.ts` | Actionable SEO improvement suggestions |
| Metadata | `src/seo/article-metadata.ts` | Next.js Metadata with OpenGraph and Twitter cards |

### Response Format

```json
{
  "primaryKeyword": "blockchain",
  "secondaryKeywords": ["defi"],
  "title": "Article Title | Stratagem",
  "description": "Optimized meta description",
  "slug": "article-title",
  "score": 85,
  "issues": [],
  "schema": {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Article Title",
    "description": "Article summary",
    "keywords": ["blockchain", "defi"]
  }
}
```

### SEO Checklist

- [ ] Title is 35-60 characters
- [ ] Meta description is 100-155 characters
- [ ] Primary keyword appears in title
- [ ] Secondary keywords are relevant
- [ ] Schema markup is valid

---

## Image Generation

### Searching Pexels

```bash
curl -X POST http://localhost:3000/api/images/search \
  -H "Content-Type: application/json" \
  -H "Cookie: nf_session=<token>" \
  -d '{"query":"blockchain technology","perPage":5}'
```

### Auto-Generating Hero Images

```bash
curl -X POST http://localhost:3000/api/images/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: nf_session=<token>" \
  -d '{}'
```

Fetches Pexels images for all articles missing a `heroImage` field. Requires `PEXELS_API_KEY`.

### CLI Script

```bash
npm run generate-images
```

---

## Agent System

Four content agents run in sequence via `/api/agents`:

| Agent | File | Description |
|-------|------|-------------|
| Research | `src/agents/researchAgent.ts` | Opens research queue |
| Newsletter | `src/agents/newsletterAgent.ts` | Returns newsletter draft status |
| SEO | `src/agents/seoAgent.ts` | Metadata audit queue |
| Social | `src/agents/socialAgent.ts` | Social derivatives queue |

### Running Agents

```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -H "Cookie: nf_session=<token>"
```

---

## Operator & Recommendations

The operator recommends daily actions based on audience profile and memory.

```bash
curl -X POST http://localhost:3000/api/operator \
  -H "Content-Type: application/json" \
  -H "Cookie: nf_session=<token>" \
  -d '{"topics":["BLOCKCHAIN","SECURITY"],"events":[{"event":"article_view","metadata":{"articleSlug":"flash-loan-architecture"}}]}'
```

### Response

```json
{
  "action": "Write a new BLOCKCHAIN article",
  "reasons": ["Strongest audience signal is BLOCKCHAIN", "3 articles published this week"],
  "estimatedImpact": "High engagement from BLOCKCHAIN audience",
  "calendar": [...]
}
```

### Modules

- **Operator**: `src/operator/decision.ts` — `recommendToday(profile)`
- **Calendar**: `src/calendar/planner.ts` — `buildCalendar(profile, weeks)`
- **Evaluation**: `src/evaluation/evaluate.ts` — `evaluateDraft(draft, topics, hasProductLink)`
- **Gates**: `src/evaluation/gates.ts` — `approvalGate(evaluation)` (passes if score >= 80)

---

## Revenue Intelligence

Revenue data is sourced from Supabase `content_revenue` table:

```bash
curl http://localhost:3000/api/seo
```

Returns ranked content by revenue performance.

### Revenue Ranking

- **Module**: `src/revenue/intelligence.ts`
- **Calculation**: Conversion rates, revenue per view, revenue per subscriber
- **Sort**: By total revenue descending

---

## Memory System

Agent memory backed by Supabase `agent_memory` table.

### Memory Types

| Kind | File | Description |
|------|------|-------------|
| AUDIENCE | `src/memory/audience-memory.ts` | Derives topic preferences, skill level, format preferences |
| CONTENT | `src/memory/content-memory.ts` | Records published content |
| PERFORMANCE | `src/memory/performance-memory.ts` | Records content performance (views, completion, conversions) |
| DECISION | `src/memory/decision-memory.ts` | Records operator decisions and outcomes |

### Store Operations

```typescript
import { remember, recall } from '@/memory/store';

// Store a memory
await remember({
  kind: 'AUDIENCE',
  key: 'user-preferences',
  value: { topics: ['BLOCKCHAIN', 'SECURITY'] },
  confidence: 0.8,
  source: 'analytics'
});

// Recall memories
const memories = await recall('AUDIENCE', 10);
```

---

## Distribution

Multi-channel content repurposing:

| Module | File | Output |
|--------|------|--------|
| Newsletter | `src/distribution/newsletter-builder.ts` | Newsletter sections from ArticlePlan |
| Social | `src/distribution/social-generator.ts` | LinkedIn post, X/Twitter thread, Discord message |
| Podcast | `src/distribution/podcast-generator.ts` | Episode outline with segments |
| Video | `src/distribution/video-outline.ts` | Video script outline with beats |
| Discord | `src/distribution/discord-publisher.ts` | Publish to Discord webhook |

---

## Payments (Stripe)

### Checkout

```bash
curl -X POST http://localhost:3000/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"priceId":"price_...","email":"user@example.com"}'
```

### Webhooks

Endpoint: `/api/webhooks/stripe`

Handles 6 event types:
- `checkout.session.completed`
- `checkout.session.expired`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.created`
- `customer.subscription.deleted`

Requires `STRIPE_WEBHOOK_SECRET` for signature verification.

---

## Environment Variables

All managed via `src/lib/env.ts`:

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SITE_URL` | No | Base URL (default: `http://localhost:3000`) |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase public key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service role (server-side) |
| `RESEND_API_KEY` | No | Resend email service |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `PEXELS_API_KEY` | No | Pexels image search |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `CRON_SECRET` | No | Cron job + programmatic API auth |
| `DISCORD_WEBHOOK_URL` | No | Discord incoming webhook |
| `NEWSLETTER_FROM` | No | Sender email (default: `signal@neon-forge.dev`) |

### Secrets Management

- `load-env.sh` — loads secrets from KDE Wallet
- `store-env.sh` — interactive script to store secrets into KDE Wallet
- `npm run dev:secure` — loads secrets then starts dev server
- `.env.local` is gitignored; production secrets live on Vercel

---

## Database Schema

17 tables with RLS policies:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (linked to auth.users, XP, level) |
| `articles` | Article content (slug, title, category, difficulty, body) |
| `projects` | Project definitions (slug, name, status, payload JSONB) |
| `books` | Book metadata (slug, title, purchase/sample URLs) |
| `events` | Event listings (title, starts_at, location, status) |
| `subscribers` | Newsletter subscribers (email, source, status) |
| `newsletter_issues` | Newsletter issues (subject, status, content JSONB, rates, revenue) |
| `analytics_events` | Event tracking (event_name, path, article_slug, metadata) |
| `achievements` | Achievement definitions (slug, title, xp) |
| `user_achievements` | User-achievement junction (with unlock timestamp) |
| `missions` | Mission definitions (slug, track, steps JSONB, reward, xp) |
| `job_runs` | Job execution log (job_name, status, timestamps, errors, output_count) |
| `agent_memory` | Agent memory store (kind, key, value JSONB, confidence, source) |
| `content_revenue` | Revenue intelligence (slug, views, subscribers, purchases, revenue) |

### RLS Policies

- `profiles`: Users can read/update own profile
- `user_achievements`: Users can read own achievements
- `analytics_events`: Anyone can insert

### Setup

Run `supabase/schema.sql` in a Supabase SQL project. The policies intentionally keep profile reads private while allowing anonymous analytics inserts.

---

## API Reference

### Authentication

Most API endpoints require no authentication for local development. Protected endpoints require either:

1. **Session cookie** (`nf_session`): Login via `/api/auth` to receive
2. **Cron secret**: `Authorization: Bearer <CRON_SECRET>` or `X-Cron-Secret` header

### POST /api/auth

Authenticate user.

**Request:**
```json
{"action": "login", "email": "user@example.com", "password": "..."}
// or
{"action": "signup", "email": "...", "password": "...", "username": "..."}
```

### GET /api/status

Check integration status.

**Response:**
```json
{
  "supabase": false,
  "resend": false,
  "stripe": false,
  "gemini": true,
  "discord": false,
  "scheduler": false
}
```

### GET /api/control

Get control center state.

**Response:**
```json
{
  "issue": {...},
  "queue": [...],
  "timeline": [...],
  "lastResearch": "2026-01-15T00:00:00Z",
  "counts": {"articles": 16, "projects": 14, "books": 3}
}
```

### POST /api/control

Execute control action.

**Request:**
```json
{"action": "research"}
// or
{"action": "generate"}
// or
{"action": "approve", "id": "newsletter-123"}
// or
{"action": "generate-articles"}
```

### POST /api/articles/generate

Generate article content.

**Request:**
```json
{"action": "generate-all"}
// or
{"slug": "article-slug"}
```

**Response:**
```json
{"success": true, "generated": 16, "failed": 0}
```

### POST /api/agents

Run all 4 content agents in sequence.

**Response:**
```json
{
  "results": [
    {"agent": "research", "status": "queued"},
    {"agent": "newsletter", "status": "needs_review"},
    {"agent": "seo", "status": "queued"},
    {"agent": "social", "status": "queued"}
  ]
}
```

### POST /api/operator

Get today's recommendation.

**Request:**
```json
{"topics": ["BLOCKCHAIN"], "events": [{"event": "article_view", "metadata": {"articleSlug": "flash-loan-architecture"}}]}
```

### POST /api/newsletter

Subscribe to newsletter or generate issue.

**Request:**
```json
{"email": "user@example.com"}
// or
{"action": "generate"}
```

### POST /api/seo

Analyze SEO for content.

**Request:**
```json
{"title": "...", "summary": "...", "topics": ["..."]}
```

### POST /api/images/search

Search Pexels for images.

**Request:**
```json
{"query": "blockchain technology", "perPage": 5}
```

### POST /api/images/generate

Auto-generate hero images for articles missing them.

### POST /api/checkout

Create Stripe checkout session.

**Request:**
```json
{"priceId": "price_...", "email": "user@example.com"}
```

### GET /api/jobs/research

Scheduled research job (Vercel cron: Monday 13:00 UTC).

Requires `CRON_SECRET` for authentication.

### GET /api/search

Search articles, projects, books.

**Query params:** `?q=search+term`

---

## Troubleshooting

### Article Generation Fails

**Error:** `GEMINI_API_KEY is not configured`

**Solution:** Add your Gemini API key to `.env.local`:
```
GEMINI_API_KEY=your-gemini-key-here
```

### Build Errors

**Error:** `Type 'X' is not assignable to type 'Y'`

**Solution:** Run type checking:
```bash
npx tsc --noEmit
```

Fix any reported type errors.

### Newsletter Not Sending

**Error:** `RESEND_API_KEY is not configured`

**Solution:** Add Resend API key to `.env.local`:
```
RESEND_API_KEY=re_your-key-here
```

### Research Job Fails

**Error:** `Job rate limit exceeded`

**Solution:** Wait 5 minutes between research runs, or adjust rate limit in `src/lib/rate-limit.ts`.

### Content Not Updating

**Issue:** Article changes don't appear on the site.

**Solution:** Rebuild the site:
```bash
npm run build
npm run dev
```

### Supabase Connection Issues

**Error:** `Supabase request failed: 401`

**Solution:** Verify credentials in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Image Generation Fails

**Error:** `PEXELS_API_KEY is not configured`

**Solution:** Add Pexels API key to `.env.local`:
```
PEXELS_API_KEY=your-pexels-key-here
```

### Auth Cookie Expired

**Issue:** Redirected to login unexpectedly.

**Solution:** Sessions expire after 8 hours. Log in again via `/login`.

---

## File Reference

| File | Purpose |
|------|---------|
| `src/content/articles.json` | Article metadata and content |
| `src/content/projects.json` | Project definitions |
| `src/content/books.json` | Book definitions |
| `src/content/events.json` | Event definitions |
| `src/content/podcast.json` | Podcast episode definitions |
| `src/lib/content.ts` | Content type definitions |
| `src/lib/auth.ts` | HMAC-SHA256 session tokens |
| `src/lib/local-auth.ts` | File-based auth with scrypt+salt |
| `src/lib/supabase.ts` | Supabase REST API client |
| `src/lib/pexels.ts` | Pexels image search + `getArticleImages()` |
| `src/lib/charts.ts` | Category → mermaid diagram mapping |
| `src/components/MermaidDiagram.tsx` | Client component, mermaid.js rendering |
| `src/components/ArticleImage.tsx` | Pexels image wrapper with attribution |
| `src/components/ArticleFooter.tsx` | Animated SVG footer banner |
| `src/lib/resend.ts` | Resend email delivery |
| `src/lib/metrics.ts` | Metrics from Supabase |
| `src/lib/rate-limit.ts` | In-memory rate limiter |
| `src/lib/env.ts` | Environment variable access |
| `src/lib/local-store.ts` | Persistent control state |
| `src/articles/generator.ts` | Article content generation |
| `src/app/api/articles/generate/route.ts` | Article generation API |
| `src/app/api/control/route.ts` | Control center API |
| `src/app/api/newsletter/route.ts` | Newsletter API |
| `src/app/api/auth/route.ts` | Authentication API |
| `src/app/api/agents/route.ts` | Agent runner API |
| `src/app/api/operator/route.ts` | Operator recommendation API |
| `src/app/api/seo/route.ts` | SEO analysis API |
| `src/app/api/images/search/route.ts` | Image search API |
| `src/app/api/images/generate/route.ts` | Image generation API |
| `src/app/api/checkout/route.ts` | Stripe checkout API |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/app/api/jobs/research/route.ts` | Scheduled research job |
| `src/app/api/search/route.ts` | Search API |
| `src/app/api/status/route.ts` | Integration status API |
| `src/control/state.ts` | Control center state management |
| `src/intelligence/pipeline.ts` | Research pipeline |
| `src/editorial/run.ts` | Editorial pipeline runner |
| `src/editorial/formatter.ts` | Article HTML formatter |
| `src/editorial/reviewer.ts` | Draft review |
| `src/seo/optimizer.ts` | SEO analysis |
| `src/seo/ml-optimizer.ts` | Gemini-powered SEO |
| `src/memory/store.ts` | Agent memory CRUD |
| `src/evaluation/evaluate.ts` | Content quality scoring |
| `src/calendar/planner.ts` | Editorial calendar generation |
| `src/operator/decision.ts` | Daily recommendation engine |
| `src/revenue/intelligence.ts` | Revenue ranking |
| `src/distribution/social-generator.ts` | Social media content |
| `src/distribution/discord-publisher.ts` | Discord webhook publisher |
| `src/middleware.ts` | Route protection |
| `supabase/schema.sql` | Database schema |
| `data/control-state.json` | Persistent control state |
| `data/users.json` | Local user storage |
| `scripts/generate-images.ts` | Pexels image fetcher |
| `load-env.sh` | Load secrets from KDE Wallet |
| `store-env.sh` | Store secrets to KDE Wallet |

---

## Support

For issues or questions:

1. Check this guide
2. Review the README.md
3. Run `npx tsc --noEmit` for type errors
4. Check the source code comments
5. Open an issue on GitHub
