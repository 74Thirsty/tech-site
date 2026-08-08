create extension if not exists "pgcrypto";

create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default 'Unknown_User', xp integer not null default 0, level integer not null default 1, created_at timestamptz not null default now());
create table if not exists public.articles (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, category text not null, difficulty text not null, read_time text not null, xp integer not null default 0, excerpt text not null, body text, published_at timestamptz);
alter table public.articles add column if not exists tags text[] default '{}';
alter table public.articles add column if not exists generated_at timestamptz default now();
create table if not exists public.projects (id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, status text not null, description text not null, payload jsonb not null default '{}');
create table if not exists public.books (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, description text not null, purchase_url text, sample_url text);
create table if not exists public.events (id uuid primary key default gen_random_uuid(), title text not null, starts_at timestamptz not null, location text not null, registration_url text, status text not null default 'OPEN');
create table if not exists public.subscribers (id uuid primary key default gen_random_uuid(), email text unique not null, source text not null default 'newsletter', status text not null default 'active', created_at timestamptz not null default now());
create table if not exists public.newsletter_issues (id uuid primary key default gen_random_uuid(), subject text not null, status text not null default 'DRAFT', content jsonb not null default '{}', sent_at timestamptz, open_rate numeric, click_rate numeric, revenue numeric not null default 0, created_at timestamptz not null default now());
alter table public.newsletter_issues add column if not exists revenue numeric not null default 0;
create table if not exists public.analytics_events (id uuid primary key default gen_random_uuid(), event_name text not null, path text, article_slug text, metadata jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.achievements (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, description text not null, xp integer not null default 0);
create table if not exists public.user_achievements (user_id uuid references auth.users(id) on delete cascade, achievement_id uuid references public.achievements(id) on delete cascade, unlocked_at timestamptz not null default now(), primary key(user_id, achievement_id));
create table if not exists public.missions (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, track text not null, steps jsonb not null default '[]', reward text not null, xp integer not null default 0);
create table if not exists public.job_runs (id uuid primary key default gen_random_uuid(), job_name text not null, status text not null, started_at timestamptz not null, finished_at timestamptz, error_state jsonb not null default '[]', output_count integer not null default 0);
create table if not exists public.agent_memory (id uuid primary key default gen_random_uuid(), kind text not null, memory_key text not null, value jsonb not null default '{}', confidence numeric not null default 0, source text not null, created_at timestamptz not null default now());
create table if not exists public.content_revenue (id uuid primary key default gen_random_uuid(), slug text unique not null, views integer not null default 0, subscribers integer not null default 0, purchases integer not null default 0, revenue numeric not null default 0, updated_at timestamptz not null default now());

-- Marketing subscriber profiles (full PII + metadata)
create table if not exists public.subscriber_profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text not null,
  last_name text not null,
  phone text,
  source text not null default 'subscribe_page',
  status text not null default 'active',
  ip_address text,
  user_agent text,
  referer text,
  city text,
  region text,
  country text,
  latitude text,
  longitude text,
  timezone text,
  org text,
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz default now()
);
alter table public.subscriber_profiles enable row level security;
create policy "Service role full access subscriber_profiles" on public.subscriber_profiles for all using (auth.role() = 'service_role');

create table if not exists public.research_articles (id uuid primary key default gen_random_uuid(), slug text not null, title text not null, url text, source text not null, summary text, keywords text[] default '{}', importance text default 'LOW', published_at timestamptz, collected_at timestamptz default now());
create table if not exists public.research_groups (id uuid primary key default gen_random_uuid(), topic text not null, keyword text not null, sources text[] default '{}', source_count integer default 0, importance text default 'LOW', summary text, key_facts text[] default '{}', freshness_score real default 0, average_sentiment real default 0, created_at timestamptz default now());
create table if not exists public.research_analyses (id uuid primary key default gen_random_uuid(), group_id uuid references public.research_groups(id), what_happened text, is_breaking boolean default false, is_important boolean default false, source_disagreement boolean default false, technical_significance text, why_it_matters text, key_entities text[] default '{}', related_topics text[] default '{}', research_notes text, created_at timestamptz default now());

alter table public.research_articles enable row level security;
alter table public.research_groups enable row level security;
alter table public.research_analyses enable row level security;
create policy "Service role full access research_articles" on public.research_articles for all using (auth.role() = 'service_role');
create policy "Service role full access research_groups" on public.research_groups for all using (auth.role() = 'service_role');
create policy "Service role full access research_analyses" on public.research_analyses for all using (auth.role() = 'service_role');
create policy "Service role full access newsletter_issues" on public.newsletter_issues for all using (auth.role() = 'service_role');

alter table public.profiles enable row level security;
alter table public.user_achievements enable row level security;
alter table public.analytics_events enable row level security;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users read own achievements" on public.user_achievements for select using (auth.uid() = user_id);
create policy "Anyone can record analytics" on public.analytics_events for insert with check (true);

-- Visitor Intelligence System
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  visitor_id text unique not null,
  fingerprint text,
  ip_address text,
  isp text,
  organization text,
  asn text,
  network text,
  is_vpn boolean default false,
  is_proxy boolean default false,
  is_tor boolean default false,
  country text,
  country_code text,
  region text,
  city text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  timezone text,
  device_type text,
  os text,
  os_version text,
  browser text,
  browser_version text,
  vendor text,
  model text,
  screen_width integer,
  screen_height integer,
  language text,
  locale text,
  referrer text,
  referrer_domain text,
  landing_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  visit_count integer not null default 1,
  page_views integer not null default 0,
  is_new boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.visitor_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null references public.visitors(visitor_id) on delete cascade,
  session_id text unique not null,
  ip_address text,
  browser_raw text,
  device_type text,
  os text,
  browser text,
  country text,
  city text,
  referrer text,
  landing_page text,
  started_at timestamptz not null default now(),
  last_active timestamptz not null default now(),
  duration integer not null default 0,
  page_views integer not null default 0,
  events integer not null default 0,
  ended boolean not null default false
);

create table if not exists public.visitor_page_views (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null references public.visitors(visitor_id) on delete cascade,
  session_id text not null references public.visitor_sessions(session_id) on delete cascade,
  path text not null,
  title text,
  article_slug text,
  referrer text,
  load_time integer,
  scroll_depth integer,
  created_at timestamptz not null default now()
);

create table if not exists public.visitor_events (
  id uuid primary key default gen_random_uuid(),
  visitor_id text not null references public.visitors(visitor_id) on delete cascade,
  session_id text not null references public.visitor_sessions(session_id) on delete cascade,
  event_type text not null,
  event_name text not null,
  path text,
  article_slug text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.ip_enrichments (
  id uuid primary key default gen_random_uuid(),
  ip_address text unique not null,
  country text,
  country_code text,
  region text,
  city text,
  postal_code text,
  latitude numeric,
  longitude numeric,
  timezone text,
  isp text,
  organization text,
  asn text,
  network text,
  is_vpn boolean default false,
  is_proxy boolean default false,
  is_tor boolean default false,
  enrichment_source text not null default 'ip-api',
  enriched_at timestamptz not null default now()
);

-- Indexes for visitor intelligence
create index if not exists idx_visitors_visitor_id on public.visitors(visitor_id);
create index if not exists idx_visitors_ip on public.visitors(ip_address);
create index if not exists idx_visitors_country on public.visitors(country_code);
create index if not exists idx_visitors_last_seen on public.visitors(last_seen desc);
create index if not exists idx_visitors_first_seen on public.visitors(first_seen desc);
create index if not exists idx_visitor_sessions_visitor_id on public.visitor_sessions(visitor_id);
create index if not exists idx_visitor_sessions_started on public.visitor_sessions(started_at desc);
create index if not exists idx_visitor_page_views_visitor_id on public.visitor_page_views(visitor_id);
create index if not exists idx_visitor_page_views_session_id on public.visitor_page_views(session_id);
create index if not exists idx_visitor_page_views_created on public.visitor_page_views(created_at desc);
create index if not exists idx_visitor_events_visitor_id on public.visitor_events(visitor_id);
create index if not exists idx_visitor_events_session_id on public.visitor_events(session_id);
create index if not exists idx_visitor_events_type on public.visitor_events(event_type);
create index if not exists idx_visitor_events_created on public.visitor_events(created_at desc);
create index if not exists idx_ip_enrichments_ip on public.ip_enrichments(ip_address);

-- RLS for visitor intelligence (service role only)
alter table public.visitors enable row level security;
alter table public.visitor_sessions enable row level security;
alter table public.visitor_page_views enable row level security;
alter table public.visitor_events enable row level security;
alter table public.ip_enrichments enable row level security;

create policy "Service role full access visitors" on public.visitors for all using (auth.role() = 'service_role');
create policy "Service role full access visitor_sessions" on public.visitor_sessions for all using (auth.role() = 'service_role');
create policy "Service role full access visitor_page_views" on public.visitor_page_views for all using (auth.role() = 'service_role');
create policy "Service role full access visitor_events" on public.visitor_events for all using (auth.role() = 'service_role');
create policy "Service role full access ip_enrichments" on public.ip_enrichments for all using (auth.role() = 'service_role');
