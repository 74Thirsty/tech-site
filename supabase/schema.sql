create extension if not exists "pgcrypto";

create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, display_name text not null default 'Unknown_User', xp integer not null default 0, level integer not null default 1, created_at timestamptz not null default now());
create table if not exists public.articles (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, category text not null, difficulty text not null, read_time text not null, xp integer not null default 0, excerpt text not null, body text, published_at timestamptz);
alter table public.articles add column if not exists tags text[] default '{}';
alter table public.articles add column if not exists generated_at timestamptz default now();
create table if not exists public.projects (id uuid primary key default gen_random_uuid(), slug text unique not null, name text not null, status text not null, description text not null, payload jsonb not null default '{}');
create table if not exists public.books (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, description text not null, purchase_url text, sample_url text);
create table if not exists public.events (id uuid primary key default gen_random_uuid(), title text not null, starts_at timestamptz not null, location text not null, registration_url text, status text not null default 'OPEN');
create table if not exists public.subscribers (id uuid primary key default gen_random_uuid(), email text unique not null, source text not null default 'newsletter', status text not null default 'active', created_at timestamptz not null default now());
create table if not exists public.newsletter_issues (id uuid primary key default gen_random_uuid(), subject text not null, status text not null default 'DRAFT', content jsonb not null default '{}', sent_at timestamptz, open_rate numeric, click_rate numeric, revenue numeric not null default 0);
alter table public.newsletter_issues add column if not exists revenue numeric not null default 0;
create table if not exists public.analytics_events (id uuid primary key default gen_random_uuid(), event_name text not null, path text, article_slug text, metadata jsonb not null default '{}', created_at timestamptz not null default now());
create table if not exists public.achievements (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, description text not null, xp integer not null default 0);
create table if not exists public.user_achievements (user_id uuid references auth.users(id) on delete cascade, achievement_id uuid references public.achievements(id) on delete cascade, unlocked_at timestamptz not null default now(), primary key(user_id, achievement_id));
create table if not exists public.missions (id uuid primary key default gen_random_uuid(), slug text unique not null, title text not null, track text not null, steps jsonb not null default '[]', reward text not null, xp integer not null default 0);
create table if not exists public.job_runs (id uuid primary key default gen_random_uuid(), job_name text not null, status text not null, started_at timestamptz not null, finished_at timestamptz, error_state jsonb not null default '[]', output_count integer not null default 0);
create table if not exists public.agent_memory (id uuid primary key default gen_random_uuid(), kind text not null, memory_key text not null, value jsonb not null default '{}', confidence numeric not null default 0, source text not null, created_at timestamptz not null default now());
create table if not exists public.content_revenue (id uuid primary key default gen_random_uuid(), slug text unique not null, views integer not null default 0, subscribers integer not null default 0, purchases integer not null default 0, revenue numeric not null default 0, updated_at timestamptz not null default now());

alter table public.profiles enable row level security;
alter table public.user_achievements enable row level security;
alter table public.analytics_events enable row level security;
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Users read own achievements" on public.user_achievements for select using (auth.uid() = user_id);
create policy "Anyone can record analytics" on public.analytics_events for insert with check (true);
