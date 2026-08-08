# Crystal // Forge Admin Guide

Complete reference for managing the Crystal // Forge platform.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Control Center](#control-center)
3. [Pages & Routes](#pages--routes)
4. [Article Management](#article-management)
5. [Newsletter Operations](#newsletter-operations)
6. [Research Pipeline](#research-pipeline)
7. [SEO Management](#seo-management)
8. [Affiliate System](#affiliate-system)
9. [Amazon Product Intelligence](#amazon-product-intelligence)
10. [User Management & Auth](#user-management--auth)
11. [Image Pipeline](#image-pipeline)
12. [AI Client System](#ai-client-system)
13. [Cron Jobs](#cron-jobs)
14. [Database Schema](#database-schema)
15. [API Reference](#api-reference)
16. [Environment Variables](#environment-variables)
17. [File Reference](#file-reference)
18. [Troubleshooting](#troubleshooting)

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

# Type check (required before any deploy)
npx tsc --noEmit

# Generate Pexels images for articles
npm run generate-images

# Deploy to production
vercel --prod --yes
```

Without any external services configured, the app runs locally with data in JSON files. All integrations report as unconfigured rather than fabricating data.

---

## Control Center

Access at `/control` (protected — redirects to `/login` if unauthenticated).

### Tabs

| Tab | Description |
|-----|-------------|
| STATUS | Dashboard metrics, queue, timeline, article generation status |
| ARTICLES | Manage published/pending articles, approve/reject |
| NEWSLETTERS | View, approve, archive newsletter issues |
| SUBSCRIBERS | Manage newsletter subscribers |
| RESEARCH | Intelligence pipeline data — articles, groups, analyses, sources |
| SEO | Article SEO rankings with readability, engagement, keyword scores |
| AFFILIATE | Affiliate programs, products, analytics, AI insights |
| SYSTEM | Timeline, research runs, article generation history |

### Dashboard Actions

| Button | Action | Description |
|--------|--------|-------------|
| `Run research →` | `research` | Runs full intelligence pipeline. Collects from 9 sources, normalizes, deduplicates, classifies, ranks. |
| `Generate 1 article →` | `generate-articles` | Single article generation from research. 3 AI calls: generate → refine intro → expand deep dive. |
| `Generate 4 articles →` | `generate-articles-batch` | Batch generation — 4 articles with staggered publish dates. |
| `Generate newsletter guide →` | `generate` | Creates newsletter with DIY project (NEWSLETTER.md agent) + product review (REVIEW.md agent). Fetches Pexels images. |

### Queue Management

The review queue shows pending items awaiting approval:

- **NEEDS_REVIEW**: Item needs human approval
- **APPROVED**: Item approved for publication
- **SENT**: Newsletter has been sent
- **ARCHIVED**: Newsletter archived (hidden from public, data preserved)

---

## Pages & Routes

### Public Pages

| Route | File | Type | Description |
|-------|------|------|-------------|
| `/` | `src/app/page.tsx` | Client | Homepage |
| `/vault` | `src/app/vault/page.tsx` | Server | Article listing — static + generated articles |
| `/vault/[slug]` | `src/app/vault/[slug]/page.tsx` | Server | Article view — hero, mermaid, products, footer |
| `/projects` | `src/app/projects/page.tsx` | Server | War Room |
| `/books` | `src/app/books/page.tsx` | Server | Books and field guides |
| `/newsletter` | `src/app/newsletter/page.tsx` | Client | Newsletter — hero banner, review card, specs, past issues |
| `/podcast` | `src/app/podcast/page.tsx` | Server | Podcast episodes |
| `/events` | `src/app/events/page.tsx` | Server | Events |
| `/login` | `src/app/login/page.tsx` | Client | Login/signup form |

### API Routes

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth` | POST | None | Login/signup (local or Supabase) |
| `/api/status` | GET | None | Integration status |
| `/api/newsletter` | POST | None | Subscribe to newsletter |
| `/api/analytics` | POST | None | Record analytics event |
| `/api/search` | GET | None | Search articles, projects, books |
| `/api/checkout` | POST | None | Stripe checkout session |
| `/api/webhooks/stripe` | POST | Stripe sig | Stripe webhook handler |
| `/api/affiliate/click` | GET/POST | None | Affiliate click tracking (redirects to affiliate URL) |
| `/api/control` | GET/POST | **Protected** | Control center state and actions |
| `/api/control/newsletters` | GET | **Protected** | List all newsletter issues |
| `/api/control/newsletters/[id]` | PATCH/DELETE | **Protected** | Update/delete newsletter |
| `/api/control/seo` | GET | **Protected** | SEO analysis of all articles |
| `/api/control/affiliate` | GET/POST | **Protected** | Affiliate programs, products, analytics, Amazon sync |
| `/api/control/affiliate/insights` | POST | **Protected** | AI-powered affiliate content analysis |
| `/api/articles/generate` | POST | **Protected** | Generate articles |
| `/api/agents` | POST | **Protected** | Run content agents |
| `/api/operator` | POST | **Protected** | Operator recommendations |
| `/api/images/search` | POST | **Protected** | Search Pexels for images |
| `/api/images/generate` | POST | **Protected** | Auto-generate hero images |
| `/api/seo` | POST | **Protected** | SEO analysis |
| `/api/jobs/research` | GET/POST | CRON_SECRET | Research job (daily 08:00 UTC) |
| `/api/jobs/generate-articles` | GET | CRON_SECRET | Article generation (daily 10:00 UTC) |
| `/api/jobs/refresh-products` | GET | CRON_SECRET | Refresh stale Amazon product prices |

---

## Article Management

### Two Sources of Articles

1. **Static articles** — Hand-crafted articles in `src/content/articles.json`, bundled at build time
2. **Generated articles** — Created by the article generator, stored in Supabase `articles` table with `published_at` scheduling

The vault listing merges both sources. Generated articles only appear after their `published_at` date.

### Article Generation Pipeline

Each article goes through **3 AI calls** with delays between them:

1. **Generate body** — Full article following the CLAUDE.md agent spec. If Amazon products are detected, product context is injected as optional editorial guidance.
2. **Refine intro** — Target 1200 words ±15 for the introduction
3. **Expand deep dive** — Add code snippets, mermaid charts, remove cross-section repetition

#### Article Structure (from CLAUDE.md)

```
Title → Byline ("by c. e. hirschauer") → Hero Image (Pexels)
→ Intro (~1200 words ±15)
→ THE DEEP DIVE (600-800 words with code + mermaid)
→ PRINCIPLES → IN PRACTICE
→ Product Recommendation (if Amazon products match topic) or Book Ad Banner
→ LIVE SIGNALS → ANTIPATTERNS → CHECKLIST → YOUR MOVE
→ Product Bottom Module (if multiple products match)
→ Footer
```

#### Live Signals Fix

When no live signals match: "Sources monitored in real time. No breaking events at time of writing." (NOT "No live signals matched this topic at generation time.")

### Article Page Layout (`/vault/[slug]`)

1. **Hero image** — Pexels image matched to article category
2. **Mermaid diagram** — Category-specific chart at ~33% of body
3. **Second image** — Pexels image matched to article tags at ~66%
4. **Product recommendation** — If Amazon products match the article topic (ProductSidebar replaces BookAd when products exist)
5. **Footer banner** — Animated SVG with Crystal // Forge logo, social links, donate button

### Topic Selection

The topic engine maintains a pool of 20+ topics across categories:

| Category | Sample Topics |
|----------|--------------|
| SECURITY | Zero Trust, Container Security, API Hardening, OSINT |
| BLOCKCHAIN | Smart Contract Auditing, DeFi Liquidation, Layer 2 |
| LINUX | Home Lab, Filesystem Forensics, Privacy Desktop |
| AI | Agents, Automation, Architecture |
| SYSTEMS | Infrastructure, Monitoring, Distributed Systems |
| PRIVACY | DNS, Encryption, Opsec, Wireless |
| NETWORKING | Traffic Analysis, Protocol Deep Dives |
| DEVOPS | CI/CD, Kubernetes, Ansible |

### Scheduled Publishing

- Article 1: publishes immediately
- Article 2: publishes tomorrow 09:00 UTC
- Article 3: publishes in 2 days 09:00 UTC
- Article 4: publishes in 3 days 09:00 UTC

---

## Newsletter Operations

### Overview

Each newsletter contains **two sections**:

1. **DIY Project** — A complete, step-by-step how-to manual following the NEWSLETTER.md agent spec
2. **Product Review** — A comprehensive, unbiased product review following the REVIEW.md agent spec

### AI Agent Injection

The generator reads both agent files at runtime and injects them as system prompts:

- `NEWSLETTER.md` — 519-line master how-to manual generator agent
- `REVIEW.md` — 415-line master product review agent

### Mode Classification

Before writing, the AI classifies the request:

**DIY Project Modes:**
- MODE A: Technical Build (computers, servers, networks, software, hardware)
- MODE B: DIY Project (building, modifying, installing, repairing, configuring)
- MODE C: Skill Training (learning techniques, workflows, professional skills)
- MODE D: Strategy Guide (games, optimization, tactics, decision making)
- MODE E: Troubleshooting (diagnosing problems, repairing failures, debugging)
- MODE F: Research / Analysis (investigation methods, comparisons, analysis workflows)

**Review Modes:**
- MODE A: Technology Review (computers, phones, routers, servers, hardware, software)
- MODE B: Consumer Product Review (appliances, tools, vehicles, household)
- MODE C: Professional Equipment Review (developer tools, networking, cameras, industrial)
- MODE D: Subscription / Service Review (SaaS, cloud services, apps, memberships)

### Newsletter Structure

```
Hero Banner (Pexels image)
→ Issue Header (title, subtitle, meta)
→ Table of Contents
→ Review Card (product name, verdict badge, score, specs table, product image)
→ Main Guide Content:
    DIY Project section (3000+ words)
    <hr>
    Product Review section (2000+ words)
→ Section images (Pexels) inserted between major sections
```

### Image Pipeline

The generator fetches Pexels images for:
- **Hero image** — Full-width banner based on `heroImage` search query
- **Section images** — Inserted at `<hr>` breaks in the content (up to 4)
- **Product review image** — Pexels image for the reviewed product

All images include photographer attribution.

### Generating a Newsletter

1. Go to `/control`
2. Click "Generate newsletter guide →"
3. The system runs the research pipeline for context
4. AI generates DIY project + product review with mode classification
5. Pexels images are fetched for hero, sections, and product
6. Review the draft in the queue
7. Click "APPROVE" to approve

### Newsletter Management

- **Approve** — Sets status to APPROVED, visible on public page
- **Mark Sent** — Sets status to SENT
- **Clear All** — Archives all newsletters (sets status to ARCHIVED), data preserved
- **Delete** — Permanently removes from Supabase

Archived newsletters are hidden from the public `/newsletter` page but remain in the control panel with a red "ARCHIVED" badge.

### Public Newsletter Page (`/newsletter`)

The page displays:
- Hero banner with Pexels image and dark gradient overlay
- Issue header with title, subtitle, estimated read time, difficulty, topics
- Table of contents with numbered sections
- Review card with product name, verdict badge (BUY/WAIT/AVOID), score, specs table
- Main guide content with inline section images
- Past issues grid at bottom

---

## Research Pipeline

### Intelligence Collectors

| Collector | Source | Data |
|-----------|--------|------|
| GitHub | GitHub API | Trending repositories |
| Hacker News | Firebase API | Top stories |
| CVE | NVD API | Recent vulnerabilities |
| CryptoPanic | CryptoPanic API | Crypto news |
| CoinGecko | CoinGecko API | Trending coins |
| GDELT | GDELT API | Global events |
| NewsData | NewsData API | News articles |
| NewsAPI | NewsAPI API | News articles |

### Pipeline Processing

1. **Collection** — Gather raw items from all collectors (sequential with 2s delays)
2. **Normalization** — Standardize format and fields
3. **Deduplication** — Remove duplicate items
4. **Classification** — Auto-tag with taxonomy (150+ keywords)
5. **Ranking** — Score by relevance, audience fit, timing, business value
6. **AI Analysis** — Analyze top groups for significance
7. **Article Planning** — Generate article plans from top-scoring research
8. **Product Intelligence** — Detect commercial entities, fetch Amazon products (if configured)

### Research Tab (Control Panel)

Sub-tabs: **ARTICLES / GROUPS / ANALYSES / SOURCES**

**ARTICLES**
- Sentiment indicator (green/orange/red dot with numeric value)
- Source badge, keyword, publisher, date
- Searchable, filterable by source and keyword

**GROUPS**
- Importance badges (CRITICAL/HIGH/MEDIUM/LOW)
- Freshness progress bar
- Source count indicator
- Key fact tags
- Searchable, filterable by importance and keyword

**ANALYSES**
- BREAKING / IMPORTANT badges
- What happened, technical significance, why it matters
- Key entity tags

**SOURCES**
- Visual bar chart showing article count per source
- Keyword cloud with size scaled by frequency — click to filter articles

### Rolling Window

Research data uses a 48-hour rolling window. The research job prunes articles, groups, and analyses older than 48 hours after each run.

### Research Cron

Runs daily at 08:00 UTC (not weekly). Collects from all 9 sources, stores in Supabase, prunes old data.

---

## SEO Management

### SEO Tab

Access via `/control` → SEO tab.

Ranks all articles by SEO score. Score formula:
- Readability: 30%
- Engagement: 30%
- Keyword density: 20% (optimal ~2.5%)
- Meta description quality: 20%

### Per-Article Metrics

- **Readability score** (0-100) — Flesch-Kincaid style
- **Engagement score** (0-100) — Click/share likelihood
- **Keyword density** — Percentage of primary keyword (optimal: 1.5-3.5%)
- **Meta description** — Auto-generated, 150-155 chars
- **Suggested title** — SEO-optimized alternative
- **Content gaps** — Missing subtopics
- **Keywords** — Primary and secondary keywords

### Color Coding

- Green (80+): Strong SEO
- Orange (60-79): Needs improvement
- Red (<60): Poor SEO

---

## Affiliate System

### Overview

Monetization system that recommends products because they genuinely help the reader, not just for commission. Includes both manual product management and automated Amazon product intelligence.

### Affiliate Tab (Control Panel)

Sub-tabs: **PROGRAMS / PRODUCTS / ANALYTICS / AI INSIGHTS**

#### Programs

Add and manage affiliate networks:

| Field | Description |
|-------|-------------|
| Name | Program name (e.g., "Amazon Associates") |
| Network | Provider (Amazon, ShareASale, Impact, etc.) |
| Affiliate ID | Your affiliate/tracking ID |
| Commission rate | e.g., "5%", "$10/sale" |
| Cookie days | Tracking duration |

#### Products

Product library with:

| Field | Description |
|-------|-------------|
| Name | Product name |
| Category | Hardware, Software, SaaS, etc. |
| Vendor | Manufacturer/provider |
| Price | Current price |
| Description | What it does |
| Affiliate URL | Your affiliate link |
| Topics | Comma-separated topic tags |

Products are matched to articles/newsletters by topic overlap. Amazon products are automatically cached and refreshed.

#### Analytics

Tracks:
- Total clicks, conversions, revenue, commission
- Top products by click count
- Top articles driving affiliate clicks
- Time-series click data

#### AI Insights

Run AI analysis that:
- Matches published articles against affiliate products
- Identifies articles missing relevant product recommendations
- Suggests content opportunities for high-value products
- Priority-ranked (HIGH/MEDIUM/LOW)

### Click Tracking

**Public endpoint**: `GET /api/affiliate/click?p=PRODUCT_ID&a=ARTICLE_SLUG&url=AFFILIATE_URL`

Records click (product, article, user agent, referrer, timestamp) then redirects to the affiliate URL.

**Embed in content**: `https://stratagemconsulting.net/api/affiliate/click?p=PRODUCT_ID&a=SLUG&url=ENCODED_URL`

### Supabase Tables

```sql
CREATE TABLE affiliate_programs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  network text NOT NULL DEFAULT '',
  affiliate_id text NOT NULL DEFAULT '',
  base_url text NOT NULL DEFAULT '',
  commission_type text NOT NULL DEFAULT 'percentage',
  commission_rate text NOT NULL DEFAULT '5%',
  cookie_days int NOT NULL DEFAULT 30,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE affiliate_products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id text NOT NULL DEFAULT '',
  name text NOT NULL,
  category text NOT NULL DEFAULT '',
  vendor text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  affiliate_url text NOT NULL DEFAULT '',
  image_url text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT '',
  rating numeric NOT NULL DEFAULT 0,
  topics text[] NOT NULL DEFAULT '{}',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE affiliate_clicks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id text NOT NULL,
  article_slug text NOT NULL DEFAULT '',
  newsletter_id text NOT NULL DEFAULT '',
  clicked_at timestamptz NOT NULL DEFAULT now(),
  user_agent text NOT NULL DEFAULT '',
  referrer text NOT NULL DEFAULT ''
);

CREATE TABLE affiliate_conversions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  click_id text NOT NULL DEFAULT '',
  product_id text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  commission numeric NOT NULL DEFAULT 0,
  converted_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE affiliate_insights (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  insight_type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  product_id text,
  article_slug text,
  priority text NOT NULL DEFAULT 'MEDIUM',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS with permissive policies (service role bypasses RLS)
ALTER TABLE affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON affiliate_programs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON affiliate_products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON affiliate_clicks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON affiliate_conversions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON affiliate_insights FOR ALL USING (true) WITH CHECK (true);
```

---

## Amazon Product Intelligence

### Overview

Contextual affiliate product system that detects commercial entities in articles, fetches relevant Amazon products via the Creators API, and renders them as editorial recommendations. Products appear only when genuinely useful to the reader — never turning articles into advertisements.

### Architecture

```
Article Plan → Entity Detection → Query Generation → Amazon API →
Relevance Scoring → Product Context → Article Generation → Rendering
```

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/amazon.ts` | Creators API client (OAuth2, SearchItems, GetItems, rate limiting) |
| `src/lib/amazon-cache.ts` | Supabase product cache layer (22h freshness) |
| `src/affiliate/intelligence/entity-detector.ts` | Detects 80+ product-relevant entities from articles |
| `src/affiliate/intelligence/query-generator.ts` | Generates targeted Amazon search queries |
| `src/affiliate/intelligence/relevance-scorer.ts` | 5-factor weighted product scoring (0-1) |
| `src/affiliate/intelligence/opportunity-detector.ts` | Full pipeline orchestrator |
| `src/components/ProductCard.tsx` | Dark-themed product card with affiliate tracking |
| `src/components/ProductSidebar.tsx` | Sticky sidebar for single high-confidence product |
| `src/components/ProductBottom.tsx` | Grid for 2-3 complementary products |
| `src/affiliate/analytics/events.ts` | Decision chain event recording |
| `src/app/api/jobs/refresh-products/route.ts` | Cron for price/availability refresh |

### How It Works

1. **Entity Detection** (`entity-detector.ts`): Scans article title, tags, excerpt, and research facts against a structured category map (80+ product categories across networking, storage, security tools, hardware, books, peripherals). Classifies intent as DIRECT (reader needs this), SUPPORTING (improves workflow), or INCIDENTAL (filtered out).

2. **Query Generation** (`query-generator.ts`): Converts detected entities into 3-5 targeted Amazon search queries. Applies category refinements (e.g., SECURITY category adds "penetration testing" to tool queries).

3. **Product Fetching** (`amazon-cache.ts` → `amazon.ts`): Searches Amazon Creators API via cache layer. Products cached in Supabase `affiliate_products` table with 22-hour freshness window. Falls back to stale cache on API failure.

4. **Relevance Scoring** (`relevance-scorer.ts`): Scores each product 0-1 based on five weighted factors:
   - Semantic match (30%) — title/description overlap with entity
   - Category match (20%) — product category vs article category
   - Use-case fit (25%) — product features vs entity purpose
   - Data quality (15%) — has image, price, rating
   - Affiliate eligibility (10%) — has tracking URL, is in stock
   - Minimum threshold: 0.4

5. **Placement Decision** (`opportunity-detector.ts`):
   - High confidence (≥0.7) + DIRECT intent → sidebar
   - Medium confidence + multiple products → bottom
   - Low relevance → no affiliate module

6. **Article Generation** (`generator.ts`): Product context injected into the AI prompt as optional editorial guidance. Writer may reference products naturally or omit entirely.

7. **Rendering** (`vault/[slug]/page.tsx`):
   - `ProductSidebar` replaces `BookAd` when products exist
   - `ProductBottom` renders 2-3 complementary products before footer
   - Falls back to `BookAd` when no products match
   - All product links go through `/api/affiliate/click` for tracking

### Setup

Add Amazon Creators API credentials to `.env.local`:

```
AMAZON_CLIENT_ID=your_credential_id
AMAZON_CLIENT_SECRET=your_credential_secret
AMAZON_PARTNER_TAG=your_tracking_tag-20
AMAZON_MARKETPLACE=www.amazon.com
```

**Prerequisites**: Amazon Associates account with 10+ qualifying sales in trailing 30 days.

### Admin Actions

**Manual product sync** (from control panel or API):
```json
POST /api/control/affiliate
{"action": "sync-amazon", "keywords": ["USB ethernet adapter"], "topic": "NETWORKING"}
```

**Refresh stale prices** (cron or manual):
```
GET /api/jobs/refresh-products
Authorization: Bearer <CRON_SECRET>
```

### Failure Behavior

Every failure returns empty products. Never blocks article generation:
- No Amazon credentials → skip product intelligence
- Amazon API down → return cached products or empty
- No entities detected → no affiliate context
- No products exceed threshold → no affiliate modules
- Cache stale → still return stale data (better than nothing)

### Product Freshness

Amazon requires data freshness within 24 hours. The system:
- Caches products with `created_at` timestamp
- `findOrFetchProducts()` returns fresh products (≤22h) from cache
- Stale products re-fetched automatically via `/api/jobs/refresh-products`
- Manual refresh available via admin API

---

## User Management & Auth

### Authentication Methods

#### Local Authentication

When Supabase is not configured, users are stored locally in `data/users.json`.

Password hashing: `crypto.scrypt` with random salt (N=16384, r=8, p=1). Legacy SHA-256 hashes auto-migrate on successful login.

**Note**: Local auth does NOT work on Vercel (filesystem is read-only). Supabase auth is the only production path.

#### Supabase Authentication

When configured, users are managed through Supabase Auth. The login page sends JSON to `/api/auth`, which calls Supabase `/auth/v1/token?grant_type=password`.

### Session Management

- **Supabase token**: `nf_access_token` (primary in production)
- **Session cookie**: `nf_session` (HMAC-SHA256 signed, 8-hour expiry)
- **Signing secret**: Derived from `SUPABASE_SERVICE_ROLE_KEY` > `GEMINI_API_KEY` > `CRON_SECRET` > dev fallback

### Protected Routes

#### Pages (redirect to `/login`)
- `/control`

#### API Routes (return 401)
- `/api/control/*` (all sub-routes)
- `/api/articles/generate`
- `/api/agents`
- `/api/operator`
- `/api/images/search`
- `/api/images/generate`
- `/api/seo`
- `/api/jobs/generate-articles`
- `/api/jobs/refresh-products`

#### Public (no auth required)
- `/api/affiliate/click`
- `/api/auth`
- `/api/status`
- `/api/newsletter`
- `/api/analytics`
- `/api/search`

#### Cron/Programmatic Access

Pass `Authorization: Bearer <CRON_SECRET>` or `X-Cron-Secret` header.

---

## Image Pipeline

### Pexels Integration

All images come from Pexels via `src/lib/pexels.ts`:

- `searchPexels(query, perPage)` — Search for images
- `findBestImage(topics, title)` — Find best match for article topics
- `getArticleImages(slug, category, tags, title)` — Get hero + mid images for articles

### Newsletter Images

The newsletter generator requests image search queries from the AI, then fetches from Pexels:

1. AI outputs `heroImage` query, `sectionImages` array with queries and placements, `reviewImage` query
2. Generator fetches each query from Pexels (1 image per query)
3. Images stored in newsletter content with URLs and photographer attribution

### Article Images

Articles get images via the article page layout:
1. Hero image — Pexels image matched to article category
2. Mid image — Pexels image matched to article tags

---

## AI Client System

### Multi-Provider Failover (`src/lib/ai.ts`)

The AI client automatically rotates across providers:

| Provider | Models | Free Tier |
|----------|--------|-----------|
| Groq | llama-3.3-70b-versatile, llama-3.1-8b-instant, qwen/qwen3.6-27b | Yes, rate limited |
| OpenRouter | Various | Requires API key |
| Puter | Various | Requires API key |
| Gemini | gemini-2.0-flash | Yes, rate limited |

**Failover order**: Groq → OpenRouter → Puter → Gemini

**Retry logic**: 429 errors trigger automatic retry with next provider. `pipelineDelay()` adds 2s between AI calls to avoid rate limits.

### Pipeline Delay

All AI-consuming pipelines use sequential calls with delays:
- Article generation: 3 calls (generate → refine → expand) with 2s delays
- Newsletter generation: 1 call with research pipeline delays
- Editorial planner: Sequential scoring with delays
- Research analyzer: Sequential analysis with delays

### Agent Files

| File | Purpose | Lines |
|------|---------|-------|
| `CLAUDE.md` | Article writer agent — voice, structure, quality criteria | 200+ |
| `NEWSLETTER.md` | How-to manual generator agent | 519 |
| `REVIEW.md` | Product review agent | 415 |

These are read at runtime and injected into AI prompts.

---

## Cron Jobs

Three cron jobs run on Vercel:

| Job | Schedule | Endpoint | Description |
|-----|----------|----------|-------------|
| Research | Daily 08:00 UTC | `/api/jobs/research` | Collects from 9 sources, stores in Supabase, prunes >48h data |
| Article Generation | Daily 10:00 UTC | `/api/jobs/generate-articles` | Generates 1 article if fewer than 2 scheduled for next 7 days |
| Product Refresh | Daily 04:00 UTC | `/api/jobs/refresh-products` | Refreshes stale Amazon product prices (22h+ freshness window) |

### Vercel Configuration

```json
{
  "crons": [
    {"path": "/api/jobs/research", "schedule": "0 8 * * *"},
    {"path": "/api/jobs/generate-articles", "schedule": "0 10 * * *"},
    {"path": "/api/jobs/refresh-products", "schedule": "0 4 * * *"}
  ]
}
```

**Note**: Vercel Hobby plan limits to once-per-day crons. Upgrade to Pro for hourly.

### Auto-Generation Logic

The daily article generation job:
1. Checks Supabase for articles with `published_at` in the next 7 days
2. If fewer than 2 are scheduled, generates 1 new article
3. Article gets a `published_at` date for today 09:00 UTC

### Product Refresh Logic

The daily product refresh job:
1. Fetches all enabled products from `affiliate_products` where `created_at` is >22h old
2. Re-fetches current price/availability via Amazon `getItems()` API
3. Updates cached data with fresh timestamps
4. Caps at 10 products per refresh cycle to avoid rate limits

---

## Database Schema

### Supabase Tables

| Table | Purpose |
|-------|---------|
| `articles` | Generated article content |
| `newsletter_issues` | Newsletter issues with content JSONB |
| `analytics_events` | Event tracking |
| `research_articles` | Raw research articles |
| `research_groups` | Deduplicated research topics |
| `research_analyses` | AI-analyzed research groups |
| `job_runs` | Job execution log |
| `subscribers` | Newsletter subscribers |
| `affiliate_programs` | Affiliate network configurations |
| `affiliate_products` | Product library (manual + Amazon cached) |
| `affiliate_clicks` | Click tracking |
| `affiliate_conversions` | Conversion tracking |
| `affiliate_insights` | AI-generated insights |
| `affiliate_events` | Product intelligence decision chain events |

### Core Tables

#### articles

```sql
id           uuid        PRIMARY KEY
slug         text        NOT NULL
title        text        NOT NULL
category     text        NOT NULL
difficulty   text
read_time    text
xp           integer
excerpt      text
body         text
published_at timestamptz
tags         text[]      DEFAULT '{}'
generated_at timestamptz DEFAULT now()
status       text        DEFAULT 'PENDING'  -- PENDING, PUBLISHED, REJECTED
```

#### newsletter_issues

```sql
id          uuid        PRIMARY KEY
subject     text        NOT NULL
status      text        NOT NULL DEFAULT 'DRAFT'  -- DRAFT, NEEDS_REVIEW, APPROVED, SENT, ARCHIVED
content     jsonb       -- Full newsletter data (mainGuide, review, images, specs, etc.)
created_at  timestamptz DEFAULT now()
```

#### research_articles

```sql
id            uuid        PRIMARY KEY
external_id   text        UNIQUE
title         text
summary       text
content       text
url           text
publisher     text
published_at  timestamptz
author        text
keyword       text
source        text
fetched_at    timestamptz
language      text        DEFAULT 'en'
image         text
sentiment     numeric
created_at    timestamptz DEFAULT now()
```

#### affiliate_events

```sql
article_slug      text        NOT NULL
entity            text        NOT NULL
intent            text        NOT NULL
queries           text[]      NOT NULL DEFAULT '{}'
selected_products text[]      NOT NULL DEFAULT '{}'
relevance_score   numeric     NOT NULL DEFAULT 0
placements        text[]      NOT NULL DEFAULT '{}'
timestamp         timestamptz NOT NULL DEFAULT now()
```

---

## API Reference

### POST /api/auth

Authenticate user.

**Request:**
```json
{"action": "login", "email": "user@example.com", "password": "..."}
// or
{"action": "signup", "email": "...", "password": "...", "username": "..."}
```

### GET /api/control

Get control center state.

### POST /api/control

Execute control action.

**Actions:**
```json
{"action": "research"}
{"action": "generate-articles"}
{"action": "generate-articles-batch"}
{"action": "generate"}
{"action": "approve", "id": "newsletter-id"}
{"action": "clear-newsletters"}
```

### GET /api/control/seo

Returns SEO rankings for all articles.

**Response:**
```json
{
  "rankings": [
    {
      "id": "...",
      "slug": "article-slug",
      "title": "Article Title",
      "category": "SECURITY",
      "status": "PUBLISHED",
      "xp": 300,
      "readabilityScore": 75,
      "engagementScore": 82,
      "keywordDensity": 2.3,
      "metaDescription": "...",
      "suggestedTitle": "...",
      "contentGaps": ["gap1", "gap2"],
      "keywords": ["kw1", "kw2"],
      "overallScore": 78
    }
  ]
}
```

### GET /api/control/affiliate

Returns affiliate programs, products, stats, and insights.

**Response:**
```json
{
  "programs": [...],
  "products": [...],
  "stats": {
    "totalClicks": 42,
    "totalConversions": 3,
    "totalRevenue": 150.00,
    "totalCommission": 12.50,
    "topProducts": [{"product_id": "...", "clicks": 15}],
    "topArticles": [{"article_slug": "...", "clicks": 20}],
    "clicksByDay": [{"date": "2026-08-05", "count": 12}]
  },
  "insights": [...]
}
```

### POST /api/control/affiliate

**Actions:**
```json
{"action": "add-program", "program": {...}}
{"action": "update-program", "id": "...", "updates": {...}}
{"action": "delete-program", "id": "..."}
{"action": "add-product", "product": {...}}
{"action": "update-product", "id": "...", "updates": {...}}
{"action": "delete-product", "id": "..."}
{"action": "add-insight", "insight": {...}}
{"action": "sync-amazon", "keywords": ["usb ethernet adapter"], "topic": "NETWORKING"}
```

### POST /api/control/affiliate/insights

Runs AI analysis matching articles to affiliate products.

**Response:**
```json
{
  "insights": [
    {
      "type": "MISSING_PRODUCTS",
      "title": "Article title",
      "description": "Why this product fits",
      "articleSlug": "article-slug",
      "productCategory": "category",
      "priority": "HIGH"
    }
  ],
  "count": 5
}
```

### GET /api/affiliate/click

Tracks affiliate click and redirects.

**Query params:** `p` (product_id), `a` (article_slug), `n` (newsletter_id), `url` (affiliate URL)

### GET /api/control/newsletters

Returns all newsletter issues.

### GET /api/jobs/research

Runs research pipeline. Requires CRON_SECRET.

### GET /api/jobs/generate-articles

Auto-generates articles. Requires CRON_SECRET.

### GET /api/jobs/refresh-products

Refreshes stale Amazon product prices. Requires CRON_SECRET.

**Response:**
```json
{
  "success": true,
  "refreshed": 5,
  "failed": 0,
  "timestamp": "2026-08-07T04:00:00.000Z"
}
```

---

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
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `CRON_SECRET` | No | Secret for `/api/jobs/*` endpoints |
| `DISCORD_WEBHOOK_URL` | No | Discord incoming webhook URL |
| `NEWSLETTER_FROM` | No | Default: `signal@neon-forge.dev` |
| `PUTERJS_API_KEY` | No | Puter AI API key |
| `OPENROUTER_API_KEY` | No | OpenRouter API key |
| `GROQ_API_KEY` | No | Groq API key |
| `NEWS_API_KEY` | No | NewsAPI.org API key (news collector) |
| `NEWSDATA_API_KEY` | No | NewsData.io API key (news collector) |
| `CRYPTOPANIC_API_KEY` | No | CryptoPanic API key (crypto collector) |
| `AMAZON_CLIENT_ID` | No | Amazon Creators API credential ID |
| `AMAZON_CLIENT_SECRET` | No | Amazon Creators API credential secret |
| `AMAZON_PARTNER_TAG` | No | Amazon Associates tracking tag |
| `AMAZON_MARKETPLACE` | No | Default: `www.amazon.com` |

### Rules

1. **Never introduce new env var names.** Add to `src/lib/env.ts` first, then document here.
2. **Never rename existing variables.**
3. **Never hardcode secrets** in source. Read from `process.env` via `env.*`.
4. **`.env.example` must mirror this list.**
5. **Verify with `npx tsc --noEmit`** before completing any task that touches `env.ts` or route handlers.

### Secrets Management

- `load-env.sh` loads secrets from KDE Wallet (folder: `arcade-site`)
- `store-env.sh` prompts for and stores secrets into KDE Wallet
- `.env.local` is gitignored; production secrets live on Vercel
- `CRON_SECRET` is used on Vercel for scheduled jobs + programmatic API access

---

## File Reference

### AI & Generation

| File | Purpose |
|------|---------|
| `src/lib/ai.ts` | Multi-provider AI client (Groq → OpenRouter → Puter → Gemini) |
| `src/lib/puter.ts` | Puter.js REST API wrapper (fallback) |
| `src/articles/generator.ts` | Article generation — 3 AI calls per article |
| `src/newsletter/guide-generator.ts` | Newsletter generation — DIY + review with Pexels images |
| `src/editorial/formatter.ts` | Article HTML formatter |
| `src/editorial/run.ts` | Editorial pipeline runner |
| `CLAUDE.md` | Article writer agent spec |
| `NEWSLETTER.md` | How-to manual generator agent spec |
| `REVIEW.md` | Product review agent spec |

### Research & Intelligence

| File | Purpose |
|------|---------|
| `src/research/pipeline.ts` | Research pipeline (collection → analysis → planning → product intelligence) |
| `src/research/knowledge-base.ts` | Supabase CRUD for research data + 48h pruning |
| `src/research/planner.ts` | Editorial queue scoring |
| `src/research/analyzer.ts` | AI research analysis |
| `src/intelligence/collectors/*.ts` | Individual data collectors |

### Amazon Product Intelligence

| File | Purpose |
|------|---------|
| `src/lib/amazon.ts` | Creators API client — OAuth2, SearchItems, GetItems, rate limiting |
| `src/lib/amazon-cache.ts` | Supabase cache layer — findOrFetchProducts, refreshStaleProducts |
| `src/affiliate/intelligence/entity-detector.ts` | Product entity detection — 80+ categories, intent classification |
| `src/affiliate/intelligence/query-generator.ts` | Amazon search query generation |
| `src/affiliate/intelligence/relevance-scorer.ts` | 5-factor weighted product scoring |
| `src/affiliate/intelligence/opportunity-detector.ts` | Full pipeline orchestrator |
| `src/affiliate/analytics/events.ts` | Decision chain event recording |

### Affiliate System

| File | Purpose |
|------|---------|
| `src/lib/affiliate.ts` | Affiliate CRUD, click tracking, analytics (19 functions) |
| `src/app/api/affiliate/click/route.ts` | Public click tracking + redirect endpoint |
| `src/app/api/control/affiliate/route.ts` | Admin affiliate management + Amazon sync |
| `src/app/api/control/affiliate/insights/route.ts` | AI affiliate insights |

### Control Panel

| File | Purpose |
|------|---------|
| `src/app/control/page.tsx` | Control dashboard — STATUS/ARTICLES/NEWSLETTERS/SUBSCRIBERS/RESEARCH/SEO/AFFILIATE/SYSTEM tabs |
| `src/control/state.ts` | Control state management |
| `src/app/api/control/route.ts` | Control API — research, generate, approve, clear-newsletters |
| `src/app/api/control/seo/route.ts` | SEO rankings endpoint |
| `src/app/api/control/affiliate/route.ts` | Affiliate management endpoint |
| `src/app/api/control/affiliate/insights/route.ts` | AI affiliate insights |
| `src/app/api/control/newsletters/route.ts` | Newsletter listing |
| `src/app/api/control/newsletters/[id]/route.ts` | Newsletter update/delete |

### Pages

| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Homepage |
| `src/app/vault/page.tsx` | Article listing |
| `src/app/vault/[slug]/page.tsx` | Article view — hero, mermaid, products, footer |
| `src/app/newsletter/page.tsx` | Newsletter — hero, review card, specs, past issues |
| `src/app/podcast/page.tsx` | Podcast episodes |
| `src/app/books/page.tsx` | Books |
| `src/app/projects/page.tsx` | War Room |
| `src/app/events/page.tsx` | Events |
| `src/app/login/page.tsx` | Login/signup |

### Lib & Utilities

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | HMAC-SHA256 session tokens, `requireAuth()` |
| `src/lib/local-auth.ts` | File-based auth with scrypt+salt |
| `src/lib/supabase.ts` | Supabase REST API client |
| `src/lib/pexels.ts` | Pexels image search |
| `src/lib/env.ts` | Environment variable access |
| `src/lib/affiliate.ts` | Affiliate CRUD, click tracking, analytics |
| `src/lib/amazon.ts` | Amazon Creators API client |
| `src/lib/amazon-cache.ts` | Amazon product cache layer |
| `src/lib/generated-articles.ts` | Supabase CRUD for generated articles |
| `src/lib/rate-limit.ts` | In-memory rate limiter |
| `src/lib/content.ts` | Content type definitions |
| `src/lib/charts.ts` | Category → mermaid diagram mapping |

### Components

| File | Purpose |
|------|---------|
| `src/components/MermaidDiagram.tsx` | Mermaid.js renderer |
| `src/components/ArticleImage.tsx` | Pexels image wrapper |
| `src/components/ArticleFooter.tsx` | Animated SVG footer banner |
| `src/components/BookAd.tsx` | Static book ad (fallback when no Amazon products) |
| `src/components/ProductCard.tsx` | Amazon product card with affiliate tracking |
| `src/components/ProductSidebar.tsx` | Sticky sidebar for single high-confidence product |
| `src/components/ProductBottom.tsx` | Grid for 2-3 complementary products |

### Cron & Jobs

| File | Purpose |
|------|---------|
| `src/app/api/jobs/research/route.ts` | Research cron — daily 08:00 UTC |
| `src/app/api/jobs/generate-articles/route.ts` | Article cron — daily 10:00 UTC |
| `src/app/api/jobs/refresh-products/route.ts` | Product refresh cron — daily 04:00 UTC |
| `vercel.json` | Cron schedules |

### Config

| File | Purpose |
|------|---------|
| `src/middleware.ts` | Route protection |
| `src/seo/ml-optimizer.ts` | Gemini-powered SEO |
| `src/seo/optimizer.ts` | SEO analysis |
| `src/seo/recommendations.ts` | SEO recommendations |
| `src/analytics/collector.ts` | Analytics event recording |
| `load-env.sh` | Load secrets from KDE Wallet |
| `store-env.sh` | Store secrets to KDE Wallet |

---

## Troubleshooting

### Login fails on Vercel

**Cause**: Local auth (`data/users.json`) doesn't work on Vercel (read-only filesystem).

**Solution**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel env.

### Newsletter shows "No newsletter issues found"

**Cause**: No newsletter issues in Supabase, or all are archived.

**Solution**: Generate a new newsletter from `/control` → "Generate newsletter guide →".

### Newsletter page shows old hardcoded content

**Cause**: Browser cache or old build.

**Solution**: Hard refresh. The page now fetches from Supabase and renders dynamic content.

### Research tab shows empty

**Cause**: Research pipeline hasn't run, or all data pruned (>48h).

**Solution**: Click "Run research →" from the control panel.

### SEO tab shows "No articles to analyze"

**Cause**: No published articles in Supabase.

**Solution**: Generate articles from the control panel first.

### Affiliate tab shows empty

**Cause**: No programs or products configured.

**Solution**: Add programs and products via the Affiliate tab forms.

### Article generation returns empty results

**Cause**: Research pipeline may have failed or returned no items.

**Solution**: Run research first, then generate articles.

### Cron job not running

**Cause**: `CRON_SECRET` not configured, or Hobby plan cron limits.

**Solution**: Set `CRON_SECRET` in Vercel. Hobby plan only allows once-per-day crons.

### 429 errors from AI providers

**Cause**: Rate limiting on Groq/Puter/Gemini.

**Solution**: The multi-provider client automatically rotates. If all providers are rate-limited, wait a few minutes.

### Newsletter images not loading

**Cause**: Pexels API not configured or rate limited.

**Solution**: Ensure `PEXELS_API_KEY` is set in Vercel env.

### Amazon products not appearing in articles

**Cause**: Amazon Creators API credentials not configured, or article topic has no matching product entities.

**Solution**: Ensure `AMAZON_CLIENT_ID`, `AMAZON_CLIENT_SECRET`, and `AMAZON_PARTNER_TAG` are set in Vercel env. Check that the article's tags/category match entities in the detector's 80+ category map.

### Amazon API returns errors

**Cause**: Invalid credentials, rate limiting, or Amazon API outage.

**Solution**: Verify credentials are correct. The system falls back to cached products or empty — article generation is never blocked. Check `/api/jobs/refresh-products` logs for details.

### Product prices are stale

**Cause**: `/api/jobs/refresh-products` cron not running, or Amazon API failures.

**Solution**: Ensure the refresh-products cron is configured in `vercel.json`. Manually trigger via `GET /api/jobs/refresh-products` with CRON_SECRET header. Products remain functional with stale data but prices may be inaccurate.
