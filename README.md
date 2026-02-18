# Tech Intelligence

A personal weekly AI and tech opportunity digest. Aggregates HackerNews, arXiv, and curated newsletters, scores items with Claude Haiku, generates full opportunity analyses with Claude Sonnet, and serves them in a clean dark-mode web UI.

## Stack

- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Database:** Supabase (Postgres)
- **AI:** Claude Haiku (scoring) + Claude Sonnet (analysis + chat)
- **Agent runner:** GitHub Actions (weekly cron)
- **Hosting:** Vercel (frontend)
- **Package manager:** Bun

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo>
cd news-app
bun install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the migration in `supabase/migrations/001_initial_schema.sql` via the Supabase SQL editor
3. Copy your project URL, anon key, and service role key from **Settings → API**

### 3. Set up environment variables

```bash
cp .env.local.example .env.local
# Edit .env.local with your actual keys
```

### 4. Run the agent locally (first test)

```bash
bun run agent
```

This fetches from HackerNews, arXiv, and RSS feeds, scores items with Claude Haiku, generates opportunity analyses with Claude Sonnet, and writes results to Supabase.

### 5. Run the web app

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

1. Push this repo to GitHub
2. Connect to Vercel at [vercel.com](https://vercel.com) → Import Project
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`

---

## Set up GitHub Actions (weekly agent)

Add these secrets to your GitHub repo (**Settings → Secrets and variables → Actions**):

| Secret | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Your Supabase service role key |

The agent runs automatically every Sunday at 6pm ET. You can also trigger it manually from the **Actions** tab → **Weekly Digest** → **Run workflow**.

---

## Architecture

```
news-app/
├── app/                    # Next.js App Router
│   ├── page.tsx            # Digest (main landing page)
│   └── api/
│       ├── digest/         # GET digest items for a week
│       ├── chat/           # POST message, stream Claude response
│       └── feedback/       # POST thumbs up/down
│
├── agent/                  # Aggregation agent (run via GitHub Actions)
│   ├── run.ts              # Entry point
│   ├── sources/            # HackerNews, arXiv, RSS
│   └── pipeline/           # Dedupe, score, analyze
│
├── lib/                    # Shared types, Supabase client, Claude client
├── config/profile.json     # User profile (Phase 1 — hardcoded)
├── supabase/migrations/    # Schema SQL
└── .github/workflows/      # weekly-digest.yml
```

---

## Cost estimate

| Component | Monthly cost |
|---|---|
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| GitHub Actions | $0 |
| Claude API (~100 items scored/week + ~15 analyzed + chat) | ~$5–10 |
| **Total** | **~$5–10** |

---

## Phases

- **Phase 1 (current):** Core digest — aggregation, scoring, analysis, UI, chat
- **Phase 2:** Onboarding conversation to generate user profile
- **Phase 3:** Breaking item detection, preference learning, source management UI, archive
- **Phase 4:** Email delivery, additional sources (GitHub trending, Product Hunt)
