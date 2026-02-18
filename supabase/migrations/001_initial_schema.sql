-- Enable UUID generation
create extension if not exists "pgcrypto";

-- Single-row user profile (no auth for v1)
create table if not exists user_profile (
  id uuid primary key default gen_random_uuid(),
  interests jsonb not null default '[]',
  context text not null default '',
  goals jsonb not null default '[]',
  tracked_entities jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

-- Seed a default profile row (upserted by the agent on first run)
insert into user_profile (interests, context, goals, tracked_entities)
values (
  '[{"domain":"AI / Foundation Models","weight":1.0},{"domain":"AI × Biotech","weight":0.9},{"domain":"Developer Tools","weight":0.85}]',
  'College junior with a technical background entering a Field/Developer Engineer role. Part of a founding VC fund team at university.',
  '["Stay ahead of AI developments","Build pattern recognition for early-stage startup opportunities","Identify potential startup ideas"]',
  '["Anthropic","OpenAI","Google DeepMind","Hugging Face","Y Combinator","a16z"]'
)
on conflict do nothing;

-- Source registry — what the agent pulls from
create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  url text not null unique,
  name text not null,
  type text not null check (type in ('rss', 'api', 'scrape')),
  category text not null,
  priority int not null default 5,
  active bool not null default true,
  created_at timestamptz not null default now()
);

-- Seed initial sources
insert into sources (url, name, type, category, priority) values
  ('https://api.hnpwa.com/v0', 'Hacker News', 'api', 'Tech', 10),
  ('https://export.arxiv.org/api/query', 'arXiv', 'api', 'Research', 10),
  ('https://tldr.tech/api/rss/ai', 'TLDR AI', 'rss', 'AI Newsletter', 9),
  ('https://www.interconnects.ai/feed', 'Interconnects (Nathan Lambert)', 'rss', 'AI Newsletter', 9),
  ('https://www.deeplearning.ai/the-batch/feed/', 'The Batch (DeepLearning.AI)', 'rss', 'AI Newsletter', 8),
  ('https://magazine.sebastianraschka.com/feed', 'Ahead of AI (Raschka)', 'rss', 'AI Newsletter', 9)
on conflict (url) do nothing;

-- Processed digest items
create table if not exists digest_items (
  id uuid primary key default gen_random_uuid(),
  week_of date not null,
  headline text not null,
  summary text not null,
  why_it_matters text not null,
  opportunity_analysis text not null,
  sources jsonb not null default '[]',
  tags jsonb not null default '[]',
  score float not null default 0,
  is_featured bool not null default false,
  is_breaking bool not null default false,
  user_feedback text check (user_feedback in ('up', 'down')),
  created_at timestamptz not null default now()
);

create index if not exists digest_items_week_of_idx on digest_items (week_of desc);
create index if not exists digest_items_score_idx on digest_items (score desc);

-- Per-item chat history
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  digest_item_id uuid not null references digest_items(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_item_idx on chat_messages (digest_item_id, created_at asc);
