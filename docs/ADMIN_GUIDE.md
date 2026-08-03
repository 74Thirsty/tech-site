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
| ARTICLES | Total articles in the vault + generation run count |
| PROJECTS | Total projects in the war room |
| BOOKS | Total books and field guides |
| RESEARCH | Number of research runs completed + last run date |

### Actions

| Button | Action | Description |
|--------|--------|-------------|
| `Run research →` | `research` | Runs full intelligence pipeline (GitHub, HN, CVE, crypto collectors). Returns scored opportunities. |
| `Generate 4 articles →` | `generate-articles` | Runs research, selects 4 unique topics, generates full articles, stores in Supabase with staggered `published_at` dates across the week. |
| `Generate newsletter guide →` | `generate` | Creates a premium educational guide (NOT article format). Rotates through 6 templates: NIDS setup, Ethereum node, CI/CD pipeline, Home Assistant, Git mastery, Kubernetes hardening. |

### Queue Management

The review queue shows pending items awaiting approval:

- **NEEDS_REVIEW**: Item needs human approval
- **APPROVED**: Item has been approved for publication

Click `APPROVE ↗` on any item to approve it.

### Timeline

The timeline shows recent system actions and their results, including:
- Research run results (opportunity count, error count)
- Article generation results (article count, status)
- Newsletter draft generation
- Approval events

### Article Generation Status

Below the main controls, the dashboard shows recent article generation runs with:
- Number of articles generated
- Timestamp
- Status (COMPLETE/FAILED)
- Error count if any

---

## Pages & Routes

### Public Pages

| Route | File | Type | Description |
|-------|------|------|-------------|
| `/` | `src/app/page.tsx` | Client | Homepage — CRT toggle, hero, directory cards, latest articles, active projects, footer |
| `/vault` | `src/app/vault/page.tsx` | Server (dynamic) | Article listing — shows static articles + published generated articles filtered by `published_at` |
| `/vault/[slug]` | `src/app/vault/[slug]/page.tsx` | Server (dynamic) | Individual article view — checks static articles first, falls back to Supabase |
| `/projects` | `src/app/projects/page.tsx` | Server | "War Room" — GitHub, npm, PyPI, Docker Hub registries |
| `/books` | `src/app/books/page.tsx` | Server | 9 real books with Apple Books links and cover art |
| `/newsletter` | `src/app/newsletter/page.tsx` | Client | "The Signal" signup form + podcast listing |
| `/podcast` | `src/app/podcast/page.tsx` | Server | Podcast episodes (currently forthcoming) |
| `/events` | `src/app/events/page.tsx` | Server | Upcoming events |
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
| `/api/webhooks/stripe` | POST | Stripe sig | Stripe webhook handler |
| `/api/control` | GET/POST | **Protected** | Control center state and actions |
| `/api/articles/generate` | POST | **Protected** | Generate 4 articles from research |
| `/api/agents` | POST | **Protected** | Run all 4 content agents in sequence |
| `/api/operator` | POST | **Protected** | Get today's recommendation |
| `/api/images/search` | POST | **Protected** | Search Pexels for images |
| `/api/images/generate` | POST | **Protected** | Auto-generate hero images for articles |
| `/api/seo` | POST | **Protected** | Gemini-powered SEO analysis |
| `/api/jobs/research` | GET/POST | CRON_SECRET | Scheduled research job (Vercel cron: Monday 13:00 UTC) |
| `/api/jobs/generate-articles` | GET | CRON_SECRET | Auto-generate articles (Vercel cron: daily 10:00 UTC) |

---

## Article Management

### Two Sources of Articles

1. **Static articles** — 16 hand-crafted articles in `src/content/articles.json`, bundled at build time
2. **Generated articles** — Created by the "Generate 4 articles" button, stored in Supabase `articles` table with `published_at` scheduling

The vault listing merges both sources. Generated articles only appear after their `published_at` date.

### Static Article Structure

Articles in `src/content/articles.json`:

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
  "body": "<h2>HTML content</h2>"
}
```

### Generated Article Structure

Stored in Supabase `articles` table:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Auto-generated primary key |
| `slug` | text | Unique identifier (NOT NULL) |
| `title` | text | Article title (NOT NULL) |
| `category` | text | Category tag (NOT NULL) |
| `difficulty` | text | Difficulty level |
| `read_time` | text | Estimated read time |
| `xp` | integer | Experience points |
| `excerpt` | text | Short description |
| `body` | text | Full HTML content |
| `published_at` | timestamptz | When the article becomes visible in the vault |
| `tags` | text[] | Topic tags |
| `generated_at` | timestamptz | When the article was generated |

### Article Page Layout

Articles at `/vault/[slug]` render with a rich visual layout:

1. **Hero image** — Pexels image matched to article category
2. **Mermaid diagram** — Category-specific chart at ~33% of body
3. **Second image** — Pexels image matched to article tags at ~66%
4. **Footer banner** — Animated SVG with Crystal // Forge logo, social links, donate button

#### How Body Splitting Works

The page counts block-level tags (`<h2>`, `<h3>`, `<p>`, `<pre>`, `<ul>`, `<ol>`, `<blockquote>`) and divides at 1/3 and 2/3 to insert the mermaid chart and second image.

### Generating Articles

#### Via Control Center

1. Navigate to `/control`
2. Click "Generate 4 articles →"
3. The system automatically:
   - Runs the research pipeline (GitHub, HN, CVE, crypto)
   - Selects 4 unique topics from the intelligence
   - Generates full articles with sections: THE DEEP DIVE, PRINCIPLES, IN PRACTICE, LIVE SIGNALS, ANTIPATTERNS, CHECKLIST, YOUR MOVE
   - Stores in Supabase with staggered `published_at` dates (today, tomorrow, day 3, day 4)
4. Check timeline and article generation status for results

#### Via API

```bash
# Generate 4 articles (recommended)
curl -X POST https://stratagemconsulting.net/api/articles/generate \
  -H "Content-Type: application/json" \
  -H "Cookie: nf_access_token=<token>" \
  -d '{"action":"generate-four"}'
```

#### Via Cron (Automatic)

Articles auto-generate daily at 10:00 UTC via Vercel cron. The job checks if fewer than 2 articles are scheduled for the next 7 days. If so, it generates 4 new articles with staggered publish dates.

```json
// vercel.json
{"crons": [
  {"path": "/api/jobs/research", "schedule": "0 13 * * 1"},
  {"path": "/api/jobs/generate-articles", "schedule": "0 10 * * *"}
]}
```

### Topic Selection

The topic engine (`src/articles/topics.ts`) maintains a pool of 20+ topics across categories:

| Category | Sample Topics |
|----------|--------------|
| SECURITY | Zero Trust, Container Security, API Hardening, OSINT, Wireless Auditing, Incident Response |
| BLOCKCHAIN | Smart Contract Auditing, DeFi Liquidation, Layer 2 Scaling |
| LINUX | Home Lab, Filesystem Forensics, Privacy Desktop |
| NETWORKING | Traffic Analysis, DNS Deep Dive |
| PROGRAMMING | Git Advanced, Python Automation |
| DEVOPS | CI/CD Pipeline, Ansible Automation, Kubernetes Hardening |

Topics are scored against research items by tag overlap and keyword matches. Categories are balanced (max 2 per category in a batch of 4).

### Scheduled Publishing

Generated articles use `published_at` to control visibility:
- Article 1: publishes immediately (today 09:00 UTC)
- Article 2: publishes tomorrow 09:00 UTC
- Article 3: publishes in 2 days 09:00 UTC
- Article 4: publishes in 3 days 09:00 UTC

The vault listing filters by `published_at <= now`. Articles are always accessible by direct URL (`/vault/[slug]`).

### Article Categories

| Category | Topics |
|----------|--------|
| BLOCKCHAIN | DeFi, smart contracts, arbitrage, MEV, flash loans, Layer 2 |
| SECURITY | Hardening, threat modeling, recon, OSINT, forensics, auditing |
| LINUX | System administration, packaging, privacy, home lab |
| AI | Agents, automation, architecture |
| SYSTEMS | Infrastructure, monitoring, distributed systems, boring tech |
| PRIVACY | DNS, encryption, opsec, wireless |
| NETWORKING | Traffic analysis, protocol deep dives |
| PROGRAMMING | Git, Python, language internals |
| DEVOPS | CI/CD, containerization, Kubernetes, Ansible |

### Difficulty Levels

| Level | Description | XP Range |
|-------|-------------|----------|
| BEGINNER | Accessible to newcomers | 100-200 |
| INTERMEDIATE | Requires some experience | 230-280 |
| ADVANCED | Deep technical content | 290-380 |

---

## Newsletter Operations

### Premium Educational Guides

The newsletter generates **premium educational guides**, NOT article-format digests. Each guide is a comprehensive walkthrough that teaches a specific skill.

### Guide Templates

| Template | Difficulty | Read Time |
|----------|-----------|-----------|
| Building a Network Intrusion Detection System | INTERMEDIATE | 45 min |
| Deploying a Private Ethereum Node with Geth | ADVANCED | 50 min |
| Building a Secure CI/CD Pipeline with GitHub Actions | INTERMEDIATE | 35 min |
| Home Automation with Home Assistant | BEGINNER | 40 min |
| Mastering Git: Basics to Advanced Workflows | BEGINNER | 30 min |
| Kubernetes Security Hardening | ADVANCED | 45 min |

### Guide Structure

Each guide includes:
- Overview
- Architecture diagram
- Step-by-step walkthrough with commands
- Common mistakes
- Troubleshooting
- Advanced tips
- Further reading
- Research signals (live intelligence items)
- Summary

### Generating a Newsletter

1. Go to `/control`
2. Click "Generate newsletter guide →"
3. Review the draft in the queue (shows title, subtitle, difficulty, read time)
4. Click "Approve →" to approve

### Newsletter Template

Email template (`src/newsletter/templates.ts`):
- Background: `#0a0a0d`
- Accent: `#00ff88`
- Sections: THE SIGNAL, FIELD NOTE, MISSION OF THE WEEK, ONE THING TO READ, THE PATCH, THE UPGRADE
- Supports preheader text and unsubscribe links

### Email Delivery

Emails are sent via Resend. Configure `RESEND_API_KEY` in `.env.local`.

From address: `signal@neon-forge.dev` (configurable via `NEWSLETTER_FROM`)

---

## Research Pipeline

### Intelligence Collectors

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
curl -X POST https://stratagemconsulting.net/api/control \
  -H "Content-Type: application/json" \
  -H "Cookie: nf_access_token=<token>" \
  -d '{"action":"research"}'
```

#### Via Cron Job

Vercel cron runs research every Monday at 13:00 UTC:

```json
{
  "crons": [{
    "path": "/api/jobs/research",
    "schedule": "0 13 * * 1"
  }]
}
```

Set `CRON_SECRET` in environment for authentication.

### Pipeline Processing

1. **Collection**: Gather raw items from all collectors in parallel
2. **Normalization**: Standardize format and fields
3. **Deduplication**: Remove duplicate items
4. **Classification**: Auto-tag with taxonomy
5. **Ranking**: Score by relevance, audience fit, timing, and business value

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

## Cron Jobs

Two cron jobs run automatically on Vercel:

| Job | Schedule | Endpoint | Description |
|-----|----------|----------|-------------|
| Research | Monday 13:00 UTC | `/api/jobs/research` | Collects intelligence from GitHub, HN, CVE, crypto |
| Article Generation | Daily 10:00 UTC | `/api/jobs/generate-articles` | Generates 4 articles if fewer than 2 are scheduled for next 7 days |

### Auto-Generation Logic

The daily article generation job:
1. Checks Supabase for articles with `published_at` in the next 7 days
2. If fewer than 2 are scheduled, generates 4 new articles
3. Each article gets a `published_at` date staggered across the week
4. No action taken if 2+ articles are already scheduled

---

## User Management & Auth

### Authentication Methods

#### Local Authentication

When Supabase is not configured, users are stored locally in `data/users.json`:

Password hashing: `crypto.scrypt` with random salt (N=16384, r=8, p=1). Legacy SHA-256 hashes auto-migrate on successful login.

**Note**: Local auth does NOT work on Vercel (filesystem is read-only). Supabase auth is the only production path.

#### Supabase Authentication

When configured, users are managed through Supabase Auth. The login page sends JSON to `/api/auth`, which calls Supabase `/auth/v1/token?grant_type=password`.

### Session Management

- **Supabase token**: `nf_access_token` (primary in production)
- **Session cookie**: `nf_session` (HMAC-SHA256 signed, 8-hour expiry, local auth fallback)
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
- `/api/jobs/generate-articles`

#### Cron/Programmatic Access

Pass `Authorization: Bearer <CRON_SECRET>` or `X-Cron-Secret` header to access protected endpoints.

---

## Database Schema

### Supabase Tables

| Table | Purpose |
|-------|---------|
| `articles` | Article content (slug, title, category, difficulty, read_time, xp, excerpt, body, published_at, tags, generated_at) |
| `newsletter_issues` | Newsletter issues (subject, status, content JSONB) |
| `analytics_events` | Event tracking (event_name, path, article_slug, metadata) |
| `agent_memory` | Agent memory store (kind, key, value JSONB, confidence, source) |
| `job_runs` | Job execution log (job_name, status, timestamps, errors, output_count) |

### articles Table Columns

```sql
-- Verified columns:
id          uuid        PRIMARY KEY (auto-generated)
slug        text        NOT NULL
title       text        NOT NULL
category    text        NOT NULL
difficulty  text
read_time   text
xp          integer
excerpt     text
body        text
published_at timestamptz
tags        text[]      DEFAULT '{}'
generated_at timestamptz DEFAULT now()
```

### Adding Columns

Via Supabase SQL Editor (https://supabase.com/dashboard/project/gajuziafgxnjxpfhuxgs/editor):

```sql
ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';
ALTER TABLE articles ADD COLUMN IF NOT EXISTS generated_at timestamptz DEFAULT now();
ALTER TABLE articles ADD COLUMN IF NOT EXISTS published_at timestamptz;
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

**Response:**
```json
{
  "issue": {"id": "...", "subject": "THE SIGNAL / ...", "topics": [...], "estimatedReadTime": "45 MIN", "difficulty": "INTERMEDIATE"},
  "queue": [{"id": "...", "kind": "NEWSLETTER", "title": "...", "status": "NEEDS_REVIEW", "createdAt": "..."}],
  "timeline": ["Research complete: 28 opportunities", "Generated 4 articles from research"],
  "lastResearch": "2026-08-03T23:00:00Z",
  "counts": {"articles": 16, "projects": 14, "books": 8},
  "articleGenerations": [{"id": "...", "topicCount": 4, "generatedAt": "...", "status": "COMPLETE", "errors": []}],
  "researchRuns": 1
}
```

### POST /api/control

Execute control action.

**Request:**
```json
{"action": "research"}
// or
{"action": "generate-articles"}
// or
{"action": "generate"}
// or
{"action": "approve", "id": "newsletter-123"}
```

### POST /api/articles/generate

Generate 4 articles from research.

**Request:**
```json
{"action": "generate-four"}
```

**Response:**
```json
{
  "success": true,
  "generated": 4,
  "failed": 0,
  "articles": [
    {"slug": "zero-trust-network-architecture", "title": "Zero Trust is not a product", "category": "SECURITY"},
    {"slug": "building-home-lab", "title": "Your home lab is your training ground", "category": "LINUX"},
    {"slug": "smart-contract-auditing", "title": "Reading Solidity like an attacker", "category": "BLOCKCHAIN"},
    {"slug": "linux-filesystem-forensics", "title": "The filesystem remembers everything", "category": "SECURITY"}
  ],
  "errors": [],
  "researchCount": 28
}
```

### GET /api/jobs/generate-articles

Auto-generate articles (cron). Returns skipped if 2+ articles scheduled for next 7 days, otherwise generates 4 new articles.

Requires `CRON_SECRET` for authentication.

### GET /api/jobs/research

Scheduled research job (Vercel cron: Monday 13:00 UTC).

Requires `CRON_SECRET` for authentication.

### GET /api/search

Search articles, projects, books.

**Query params:** `?q=search+term`

---

## Troubleshooting

### Login fails on Vercel

**Cause**: Local auth (`data/users.json`) doesn't work on Vercel (read-only filesystem).

**Solution**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set in Vercel env. Supabase auth is the only production path.

### Article generation returns empty results

**Cause**: Research pipeline may have failed or returned no items.

**Solution**: Check the timeline in the control center. Run "Run research →" first to populate the intelligence pipeline, then generate articles.

### Generated articles don't appear in vault

**Cause**: Articles have future `published_at` dates.

**Solution**: Check Supabase `articles` table for `published_at` values. Articles only appear in the vault after their publish date. They are always accessible by direct URL.

### Cron job not running

**Cause**: `CRON_SECRET` not configured in Vercel env.

**Solution**: Set `CRON_SECRET` in Vercel project settings > Environment Variables.

### Auth cookie not recognized

**Cause**: Cookie expired (8-hour TTL) or middleware not detecting `nf_access_token`.

**Solution**: Log in again via `/login`. The middleware checks for `nf_session` or `nf_access_token` cookies.

### Newsletter generation fails

**Cause**: Supabase connection issue.

**Solution**: Check `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set.

---

## File Reference

### New Files (Current Session)

| File | Purpose |
|------|---------|
| `src/articles/new-generator.ts` | Generates 4 unique articles from research intelligence |
| `src/articles/topics.ts` | Topic pool (20+ topics) with scoring and selection engine |
| `src/newsletter/guide-generator.ts` | Premium educational guide generator (6 templates) |
| `src/lib/generated-articles.ts` | Supabase CRUD for generated articles |
| `src/app/api/jobs/generate-articles/route.ts` | Daily cron endpoint for auto-generation |

### Core Files

| File | Purpose |
|------|---------|
| `src/content/articles.json` | Static article metadata and content |
| `src/content/projects.json` | Project definitions |
| `src/content/books.json` | Book definitions |
| `src/content/events.json` | Event definitions |
| `src/content/podcast.json` | Podcast episode definitions |
| `src/lib/content.ts` | Content type definitions |
| `src/lib/auth.ts` | HMAC-SHA256 session tokens, `getSessionFromRequest()`, `requireAuth()` |
| `src/lib/local-auth.ts` | File-based auth with scrypt+salt |
| `src/lib/supabase.ts` | Supabase REST API client |
| `src/lib/pexels.ts` | Pexels image search |
| `src/lib/env.ts` | Environment variable access |
| `src/articles/generator.ts` | Legacy article content generation (1125 lines, hard-coded content) |
| `src/control/state.ts` | Control center state management |
| `src/intelligence/pipeline.ts` | Research pipeline |
| `src/editorial/formatter.ts` | Article HTML formatter |
| `src/seo/optimizer.ts` | SEO analysis |
| `src/seo/ml-optimizer.ts` | Gemini-powered SEO |
| `src/middleware.ts` | Route protection |

### API Routes

| File | Purpose |
|------|---------|
| `src/app/api/auth/route.ts` | Authentication API |
| `src/app/api/control/route.ts` | Control center API |
| `src/app/api/articles/generate/route.ts` | Article generation API |
| `src/app/api/agents/route.ts` | Agent runner API |
| `src/app/api/operator/route.ts` | Operator recommendation API |
| `src/app/api/seo/route.ts` | SEO analysis API |
| `src/app/api/images/search/route.ts` | Image search API |
| `src/app/api/images/generate/route.ts` | Image generation API |
| `src/app/api/checkout/route.ts` | Stripe checkout API |
| `src/app/api/webhooks/stripe/route.ts` | Stripe webhook handler |
| `src/app/api/jobs/research/route.ts` | Scheduled research job |
| `src/app/api/jobs/generate-articles/route.ts` | Daily article auto-generation |
| `src/app/api/search/route.ts` | Search API |
| `src/app/api/status/route.ts` | Integration status API |
| `src/app/api/newsletter/route.ts` | Newsletter API |

---

## Support

For issues or questions:

1. Check this guide
2. Review the README.md
3. Run `npx tsc --noEmit` for type errors
4. Check the source code comments
5. Open an issue on GitHub
