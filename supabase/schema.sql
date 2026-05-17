create extension if not exists "uuid-ossp";

create table if not exists public.brand_mentions (
  id uuid primary key default uuid_generate_v4(),
  external_id text not null unique,
  brand text not null,
  author_handle text not null,
  source text not null default 'x',
  raw_text text not null,
  normalized_text text,
  language_code text not null default 'en',
  posted_at timestamptz not null,
  ingested_at timestamptz not null default now()
);

create table if not exists public.sentiment_analyses (
  id uuid primary key default uuid_generate_v4(),
  mention_id uuid not null references public.brand_mentions(id) on delete cascade,
  model_name text not null,
  sentiment_label text not null check (sentiment_label in ('positive', 'neutral', 'negative')),
  confidence numeric(5,4) not null check (confidence >= 0 and confidence <= 1),
  latency_ms integer,
  created_at timestamptz not null default now()
);

create index if not exists idx_brand_mentions_brand_posted_at
on public.brand_mentions (brand, posted_at desc);

create index if not exists idx_sentiment_analyses_mention_id
on public.sentiment_analyses (mention_id);
