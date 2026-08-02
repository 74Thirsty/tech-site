# NEON//FORGE

Phase 1 foundation for Chris Hirschauer's technology platform: a dark, editorial landing experience built around field notes, selected work, a knowledge vault, and the weekly Signal newsletter.

## Documentation

- **[Admin Guide](docs/ADMIN_GUIDE.md)** - Complete reference for managing the platform
- **[README](README.md)** - Setup and architecture overview

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment Variables

Copy `.env.example` to `.env.local` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SITE_URL` | No | Site URL (e.g. https://yoursite.vercel.app) |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Supabase service_role key |
| `RESEND_API_KEY` | No | Resend email API key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for SEO analysis |
| `PEXELS_API_KEY` | No | Pexels API key for article images |
| `STRIPE_SECRET_KEY` | No | Stripe secret key (sk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | No | Stripe webhook signing secret |
| `CRON_SECRET` | No | Secret for scheduled job authentication |
| `DISCORD_WEBHOOK_URL` | No | Discord notification webhook |
| `NEWSLETTER_FROM` | No | Newsletter sender email (default: signal@neon-forge.dev) |

## Article Page Layout

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
4. **Footer banner** — Animated SVG with glowing NEON//FORGE logo, social links (GitHub, X, LinkedIn, Discord), and donate button

### Article Images (Pexels)

Articles automatically fetch two images from Pexels: a hero image by category and a mid-article image by tags.

```bash
npm run generate-images
```

## SEO Optimization (Gemini-Powered)

The SEO system uses Google Gemini for intelligent content analysis.

### Features

- **Keyword extraction** - Primary and secondary keywords from content
- **Readability scoring** - Flesch-Kincaid style analysis
- **Engagement scoring** - Predicted click/share potential
- **Meta description generation** - Optimized 150-155 char descriptions
- **Content gap analysis** - Identifies missing subtopics
- **Title optimization** - SEO-friendly title suggestions

### Analyze via API

```bash
curl -X POST http://localhost:3000/api/seo \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Flash Loan Architecture",
    "summary": "Borrow and repay in one transaction.",
    "topics": ["BLOCKCHAIN", "DEFI", "ARCHITECTURE"]
  }'
```

## Article Generation

The platform generates article content using Google Gemini. Articles focus on blockchain, security, Linux, and AI topics with a crypto-drop framing (buying opportunities, market corrections, accumulation).

### Generate via Control Center

1. Navigate to `/control`
2. Click "Generate articles →"
3. Articles are generated and saved to `src/content/articles.json`

### Generate via API

```bash
# Generate all articles
curl -X POST http://localhost:3000/api/articles/generate \
  -H "Content-Type: application/json" \
  -d '{"action":"generate-all"}'

# Generate single article by slug
curl -X POST http://localhost:3000/api/articles/generate \
  -H "Content-Type: application/json" \
  -d '{"slug":"flash-loan-architecture"}'
```

## Content Structure

Articles are stored in `src/content/articles.json` with this structure:

```json
{
  "slug": "flash-loan-architecture",
  "title": "Flash loans are architectural constraints",
  "category": "BLOCKCHAIN",
  "difficulty": "INTERMEDIATE",
  "readTime": "09 MIN",
  "xp": 210,
  "excerpt": "Borrow and repay in one transaction.",
  "tags": ["BLOCKCHAIN", "DEFI", "ARCHITECTURE"],
  "body": "<h2>Generated HTML content...</h2>"
}
```

Article images are stored in `src/content/images.json`:

```json
{
  "flash-loan-architecture": {
    "id": 123456,
    "url": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg",
    "alt": "Blockchain network visualization",
    "photographer": "John Doe",
    "photographerUrl": "https://www.pexels.com/@johndoe",
    "sourceUrl": "https://www.pexels.com/photo/123456/",
    "width": 1920,
    "height": 1080
  }
}
```

## Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage with hero, directory, latest articles |
| `/vault` | Article listing |
| `/vault/[slug]` | Individual article view |
| `/projects` | Project war room |
| `/books` | Books and field guides |
| `/newsletter` | The Signal newsletter signup |
| `/podcast` | Podcast episodes |
| `/events` | Upcoming events |
| `/control` | Admin control center |
| `/login` | Authentication |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/articles/generate` | POST | Generate article content |
| `/api/images/search` | POST | Search Pexels for images |
| `/api/images/generate` | POST | Generate images for articles |
| `/api/control` | GET/POST | Control center state and actions |
| `/api/newsletter` | POST | Newsletter subscription |
| `/api/auth` | POST | User authentication |
| `/api/checkout` | POST | Stripe checkout |
| `/api/status` | GET | Integration status |
| `/api/seo` | POST | Gemini-powered SEO analysis |
| `/api/analytics` | POST | Event tracking |
| `/api/agents` | POST | Agent execution |

## Architecture

```
src/
├── app/              # Next.js App Router pages and API routes
├── articles/         # Article generation system
├── calendar/         # Editorial calendar planning
├── content/          # JSON content files (articles, images)
├── control/          # Control center state management
├── distribution/     # Newsletter, social, podcast generators
├── editorial/        # Draft review and evaluation
├── evaluation/       # Content quality scoring
├── intelligence/     # Research collectors (GitHub, HN, CVE, crypto)
├── jobs/             # Scheduled background jobs
├── lib/              # Shared utilities, env, Supabase client, Pexels
├── memory/           # User memory and preferences
├── newsletter/       # Newsletter generation and delivery
├── operator/         # Personal operator recommendations
├── revenue/          # Revenue intelligence
└── seo/              # SEO optimization (Gemini-powered)
```

## Production Setup

1. Copy `.env.example` to `.env.local` and add credentials
2. Run `supabase/schema.sql` in a Supabase SQL project
3. Run `npm install && npm run build`
4. Deploy to Vercel or your preferred platform

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL)
- **Email**: Resend
- **Payments**: Stripe
- **AI**: Google Gemini 2.0 Flash
- **Images**: Pexels API
- **Diagrams**: Mermaid.js
- **Styling**: Custom CSS with CRT/terminal aesthetic
