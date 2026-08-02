# NEON//FORGE Admin Guide

Complete reference for managing the Neon//Forge platform.

---

## Table of Contents

1. [Control Center](#control-center)
2. [Article Management](#article-management)
3. [Newsletter Operations](#newsletter-operations)
4. [Research Pipeline](#research-pipeline)
5. [Content Calendar](#content-calendar)
6. [User Management](#user-management)
7. [Analytics & Metrics](#analytics--metrics)
8. [SEO Management](#seo-management)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## Control Center

Access at `/control`. The control center is the main admin dashboard.

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
| `Generate articles →` | `generate-all` | Generates content for all articles using Google Gemini |
| `Generate newsletter →` | `generate` | Creates a newsletter draft from current content |

### Queue Management

The review queue shows pending items awaiting approval:

- **NEEDS_REVIEW**: Item needs human approval
- **APPROVED**: Item has been approved for publication

Click `APPROVE ↗` on any item to approve it.

### Timeline

The timeline shows recent system actions and their results.

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
  "body": "<h2>HTML content</h2>"
}
```

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

### Research Output

Research results are stored in Supabase `research_items` table:

```json
{
  "id": "github-12345",
  "title": "project-name",
  "url": "https://github.com/...",
  "source": "GITHUB",
  "summary": "Project description",
  "topics": ["PROGRAMMING", "BLOCKCHAIN"],
  "published_at": "2026-01-15T00:00:00Z"
}
```

### Pipeline Processing

1. **Collection**: Gather raw items from all collectors
2. **Normalization**: Standardize format and fields
3. **Deduplication**: Remove duplicate items
4. **Classification**: Assign topic tags
5. **Scoring**: Rank by relevance and quality

---

## Content Calendar

### Planning

The calendar system generates editorial plans based on audience profiles.

```bash
curl http://localhost:3000/api/operator
```

Returns recommended content for the current period.

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

## User Management

### Authentication Methods

#### Local Authentication

When Supabase is not configured, users are stored locally in `data/users.json`:

```json
[
  {
    "username": "admin",
    "email": "admin@example.com",
    "passwordHash": "sha256-hashed-password"
  }
]
```

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

### Revenue Intelligence

Revenue data is sourced from Supabase `content_revenue` table:

```bash
curl http://localhost:3000/api/seo
```

Returns ranked content by revenue performance.

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

### Response Format

```json
{
  "primaryKeyword": "blockchain",
  "secondaryKeywords": ["defi"],
  "title": "Article Title | NEON//FORGE",
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

## API Reference

### Authentication

Most API endpoints require no authentication for local development. For production, set `CRON_SECRET` for job endpoints.

### Endpoints

#### POST /api/articles/generate

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

#### GET /api/control

Get control center state.

**Response:**
```json
{
  "issue": {...},
  "queue": [...],
  "timeline": [...],
  "lastResearch": "2026-01-15T00:00:00Z",
  "counts": {"articles": 16, "projects": 5, "books": 3}
}
```

#### POST /api/control

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

#### POST /api/newsletter

Subscribe to newsletter.

**Request:**
```json
{"email": "user@example.com"}
```

#### POST /api/auth

Authenticate user.

**Request:**
```json
{"action": "login", "email": "user@example.com", "password": "..."}
// or
{"action": "signup", "email": "...", "password": "...", "username": "..."}
```

#### POST /api/seo

Analyze SEO for content.

**Request:**
```json
{"title": "...", "summary": "...", "topics": ["..."]}
```

#### GET /api/status

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

---

## Troubleshooting

### Article Generation Fails

**Error:** `GEMINI_API_KEY is not configured`

**Solution:** Add your OpenAI API key to `.env.local`:
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

**Solution:** Wait 5 minutes between research runs, or adjust rate limit in `src/jobs/research-job.ts`.

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

---

## File Reference

| File | Purpose |
|------|---------|
| `src/content/articles.json` | Article metadata and content |
| `src/content/projects.json` | Project definitions |
| `src/content/books.json` | Book definitions |
| `src/content/events.json` | Event definitions |
| `src/lib/content.ts` | Content type definitions |
| `src/articles/generator.ts` | Gemini article generation |
| `src/app/api/articles/generate/route.ts` | Article generation API |
| `src/app/api/control/route.ts` | Control center API |
| `src/app/api/newsletter/route.ts` | Newsletter API |
| `src/app/api/auth/route.ts` | Authentication API |
| `src/control/state.ts` | Control center state |
| `src/intelligence/pipeline.ts` | Research pipeline |
| `src/editorial/reviewer.ts` | Draft review |
| `src/seo/optimizer.ts` | SEO analysis |
| `data/control-state.json` | Persistent control state |
| `data/users.json` | Local user storage |

---

## Support

For issues or questions:

1. Check this guide
2. Review the README.md
3. Check the source code comments
4. Open an issue on GitHub
