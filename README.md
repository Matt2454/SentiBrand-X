## Live Demo
[senti-brand-x.vercel.app](https://senti-brand-x.vercel.app)

> ⚠️ **Note:** The live demo may not reflect the latest version. 
> The codebase is actively developed — clone locally for the full experience.
# SentiBrand X Analyzer

Real-time sentiment dashboard for brand mentions from X/Twitter, powered by Next.js, Hugging Face, and Supabase.

## Tech Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + Lucide React
- Supabase (`@supabase/supabase-js`)
- Mock ingestion script with `tsx`

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables and fill values:

```bash
cp .env.example .env.local
```

3. Start development server:

```bash
npm run dev
```

## Available Scripts

- `npm run dev` — start local app
- `npm run build` — production build
- `npm run start` — run production server
- `npm run lint` — run ESLint
- `npm test` — run Vitest unit tests
- `npm run ingest:mock` — simulate X ingestion stream from `data/mockData.json`
- `npm run convert:xquik -- <export.json|jsonl> [output-json] [brand]` — convert Xquik tweet exports to mock ingestion records
- `npm run test:ai` — run a quick Hugging Face sentiment smoke test

## Data Ingestion Mock Pipeline

Mock records are stored in `data/mockData.json`.

To create mock records from a reviewed Xquik tweet export:

```bash
npm run convert:xquik -- ./xquik-export.json data/mockData.json AcmeCloud
```

Run:

```bash
npm run ingest:mock
```

This streams line-by-line JSON ingestion events to stdout so you can test processing pipelines without external APIs.

## Supabase Setup

Database schema is provided in:

- `supabase/schema.sql`

Apply it in your Supabase SQL editor to create:

- `brand_mentions`
- `sentiment_analyses`

Client initialization lives in:

- `lib/supabase.ts`

## Environment Variables

See `.env.example` for all required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `HUGGINGFACE_API_KEY`
- `X_BEARER_TOKEN`
- `MOCK_INGESTION_DELAY_MS`
- `REALTIME_PING_URL` (optional, defaults to local SSE ping endpoint)
