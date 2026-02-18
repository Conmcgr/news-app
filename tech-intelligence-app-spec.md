# Tech Intelligence App — Product Specification

## Overview

A personal tech intelligence web app designed to keep a technically-minded, opportunity-focused user sharp on developments in AI and applied AI at the intersection of fields (biotech, developer tools, finance, defense tech, etc.). The app aggregates content from multiple sources on a weekly cadence, filters for signal over noise, frames discoveries through an opportunity lens, and provides an interactive chat interface for deeper exploration of any item.

**Core job to be done:** Surface the right information early enough and in the right framing that the user can walk into any room — VC meeting, technical conversation, startup networking event — as the most plugged-in person there, and identify opportunities before they become obvious.

---

## Target User (v1)

- College junior, technical background, entering a Field/Developer Engineer role
- Part of a founding VC fund team at their university
- Interested in eventually founding or joining an early-stage startup
- Focused on AI/applied AI at the intersection of domains (biotech, finance, dev tools, etc.)
- Willing to spend 15–30 min/week in a focused session; open to brief daily check-ins for breaking items
- Wants a free or near-free solution to start

---

## Core Principles

1. **Signal over volume.** Fewer, better stories beat a firehose. This is not a news feed.
2. **Opportunity-first framing.** Every piece of content should be interpreted through the lens of "what does this make possible?"
3. **Respect the user's time.** Weekly digest is the primary format. Daily is reserved for genuinely breaking developments.
4. **Learn and improve.** Personalization starts with an onboarding conversation and improves based on user behavior over time.
5. **Stay scrappy.** Use free tiers and open APIs where possible. Prioritize working over polished.

---

## Tech Stack (Recommended)

- **Frontend:** Next.js (web app, mobile-responsive)
- **Backend:** Node.js or Python (FastAPI) with a simple job scheduler (e.g., cron)
- **Database:** SQLite or Supabase (free tier) for storing digests, user preferences, interaction history
- **AI:** Claude API (claude-haiku for summarization/filtering to keep costs low, claude-sonnet for opportunity analysis and chat)
- **Scraping/Aggregation:** Free RSS feeds, arXiv API, HackerNews API, optionally Twitter/X free tier or nitter
- **Auth:** None for v1 (single user, local or simple deploy)

---

## Information Sources (Free/Scrappy)

### Primary Sources
- **arXiv** (cs.AI, cs.LG, cs.CL, q-bio, econ.GN) — via arXiv API, free
- **biorXiv** — biotech/biology preprints, free API, key for AI × biotech signal
- **HackerNews** — top stories + "Ask HN" via official API, free
- **Papers With Code** — ML papers alongside implementations, great for spotting what's actually being built
- **TLDR Newsletter** (AI + main tech editions) — RSS, familiar baseline and useful for gap analysis

### AI Newsletters (RSS)
- **Interconnects** (Nathan Lambert) — high-signal AI research commentary, low hype
- **Ahead of AI** (Sebastian Raschka) — deep but readable ML paper breakdowns
- **Last Week in AI** — curated weekly AI developments
- **The Batch** (DeepLearning.AI) — Andrew Ng's team, solid AI research coverage
- **Import AI** (Jack Clark) — early and serious AI signal
- **Hugging Face Blog** — model releases and datasets directly from a core hub of AI activity

### Biotech × AI
- **STAT News** — best publication covering AI's intersection with health and biotech
- **Endpoints News** — biotech-focused, good for spotting where AI is hitting pharma and clinical

### VC / Startup Signal
- **Sequoia Blog** — low frequency, high quality, signals where smart money is looking
- **First Round Review** — startup ecosystem and operator thinking
- **Crunchbase News** — funding announcements, investment signal
- **a16z Blog** — thesis-heavy posts, useful for understanding VC narratives
- **Y Combinator Blog** — batch announcements, ecosystem trends

### Broader Tech
- **MIT Technology Review** — solid on AI and emerging tech, less hype than mainstream outlets
- **Nature News** — scientific breakthroughs with real-world implications
- **LessWrong** — early signal on serious AI thinking, where researchers and builders write candidly
- **Stratechery** (Ben Thompson) — free articles only, excellent for tech strategy and business model analysis
- **Reddit** — r/MachineLearning, r/artificial, r/singularity, r/biotech via Reddit API (free tier)

### Secondary Sources (Optional/Later)
- **Twitter/X** — curated list of accounts (researchers, founders, VCs) via free API tier or nitter scraping
- **GitHub trending** — surfacing repos gaining momentum
- **Product Hunt** — new AI/tech product launches
- **SEC filings / Crunchbase** — funding announcements (scrape or free API)

### Excluded / Deprioritized
- Hype-heavy consumer tech outlets (Mashable, BuzzFeed Tech)
- Duplicate aggregators
- Content older than the aggregation window

---

## Features

### 1. Onboarding — Preference Conversation
On first launch, the app runs a short conversational onboarding (powered by Claude) to establish a user profile. This is a chat interface, not a form.

**Questions the conversation should cover:**
- What domains are you most excited about right now? (AI, biotech, fintech, defense, dev tools, etc.)
- What's your current role or context? (used to calibrate opportunity framing)
- What are you trying to accomplish in the next 6–12 months?
- Are there specific topics, technologies, or companies you want to track?
- What do you already read, and what's missing from it?

**Output:** A stored user profile (JSON) with weighted interest areas, context, and goals. This profile is used to filter and rank incoming content.

---

### 2. Aggregation Agent (Weekly + Breaking)

A background job that runs on a schedule to collect, deduplicate, and score content.

#### Weekly Run (e.g., Sunday evening)
- Pulls content from all sources for the past 7 days
- Deduplicates stories covering the same underlying event
- Scores each item on:
  - **Relevance** to user's interest profile (AI intersections, biotech, etc.)
  - **Novelty** — is this genuinely new or just commentary on old news?
  - **Opportunity signal** — does this create a gap, enable something new, or indicate momentum?
- Selects top ~10–15 items for the weekly digest
- Runs opportunity analysis on each (see Feature 3)

#### Breaking / High-Signal Detection (Daily lightweight scan)
- Runs a lighter daily job that flags items exceeding a "breaking" threshold
- Threshold criteria: major model release, significant funding round (>$50M), paper with unusually high early engagement, regulatory event
- If triggered, sends a push notification or in-app alert with a 2–3 sentence brief
- Goal is to surface maybe 0–2 items per week max — not a daily feed

---

### 3. Weekly Digest View

The main product surface. A clean, readable page presenting the week's top items.

**Each digest item includes:**

- **Headline** — plain language, not clickbait
- **What happened** — 3–5 sentence factual summary
- **Why it matters** — 2–3 sentences of context and significance
- **Opportunity lens** — explicit analysis: What does this make possible? What gaps does it create? Who is building here and what's missing? What would someone need to know/do to act on this?
- **Source links** — original sources for anyone who wants to go deeper
- **Tags** — domain tags (e.g., AI × Biotech, Foundation Models, Dev Tools) and type tags (Research, Product Launch, Funding, Regulatory)
- **Chat button** — opens an interactive assistant scoped to this item

**Digest structure:**
- Top 3–5 "featured" items (highest opportunity signal, most relevant to user)
- 5–10 "also this week" items (shorter treatment, still curated)
- Optional "on the radar" section — early/weak signals worth watching but not fully developed yet

---

### 4. Interactive Story Chat

Each digest item has an attached chat interface powered by Claude. The context window includes the full item content, the original sources, and the user's profile.

**Example things a user can ask:**
- "What companies are building in this space right now?"
- "What would I need to build something here?"
- "Is anyone else doing this already?"
- "What's the VC narrative around this trend?"
- "Explain the technical concept here in plain terms"
- "What should I read to go deeper on this?"

This is not a generic chatbot — it's a research assistant that knows the specific story and the user's context. Responses should be concrete and actionable, not generic.

---

### 5. Preference Learning

The app should update the user's interest profile over time based on behavior:

- **Explicit signals:** User can thumbs up/down items, or tag items as "very relevant" / "not for me"
- **Implicit signals:** Which items the user opens, how long they spend, whether they use the chat
- **Periodic re-calibration:** Every 4 weeks, a short in-app prompt asks "here's what I've been surfacing — anything shifting for you?" — a lightweight conversation to update the profile

The goal is that by month 2–3, the digest feels meaningfully more personalized than month 1.

---

### 6. Source Discovery

A simple "sources" page where the user can:
- See what sources the agent is currently pulling from
- Add a new RSS feed, subreddit, or arXiv category
- Follow specific researchers or people by adding their arXiv author ID, Twitter handle, or blog RSS
- Mark sources as higher/lower priority

This keeps the user in control without requiring constant manual curation.

---

## User Interface

**Pages:**
1. **Digest** — main page, current week's digest (default landing page)
2. **Archive** — past weekly digests, searchable
3. **Chat** — attached to each story (modal or side panel)
4. **Sources** — manage sources and followed people
5. **Profile/Preferences** — view and edit interest profile, re-run onboarding conversation

**Design principles:**
- Clean, readable, low visual noise — this is a reading app
- Mobile-responsive (web-first, but usable on phone)
- No infinite scroll — bounded digests only
- Dark mode support

---

## Data Model (Simplified)

```
UserProfile {
  interests: [{ domain: string, weight: float }]
  context: string  // e.g., "college junior, VC fund, going into FDE role"
  goals: string[]
  trackedEntities: string[]  // companies, people, technologies
  updatedAt: timestamp
}

DigestItem {
  id: uuid
  weekOf: date
  headline: string
  summary: string
  whyItMatters: string
  opportunityAnalysis: string
  sources: Source[]
  tags: string[]
  score: float
  isFeatured: bool
  isBreaking: bool
  userFeedback: enum(up, down, null)
  createdAt: timestamp
}

Source {
  url: string
  title: string
  type: enum(article, paper, tweet, reddit, github)
  publishedAt: timestamp
}

ChatMessage {
  digestItemId: uuid
  role: enum(user, assistant)
  content: string
  timestamp: timestamp
}
```

---

## Opportunity Scoring — Prompt Design

When the agent processes each item, it should run it through a structured prompt roughly like:

```
You are an opportunity analyst for a technically-minded college student interested in 
founding companies and making early-stage investments, with a focus on AI and applied 
AI at the intersection of fields like biotech, fintech, and developer tools.

Given the following content, score it from 0-10 on opportunity signal and provide:
1. What this makes newly possible (technical or product)
2. What gap or unmet need this creates or reveals
3. Who is currently building here and what's missing
4. What someone with a technical background could do to act on this
5. Relevant adjacent spaces worth watching

Content: [item content]
User context: [user profile]
```

Items scoring below a threshold (e.g., <5) are excluded from the digest or demoted to "on the radar."

---

## Phased Build Plan

### Phase 1 — Core (MVP)
- Aggregation agent pulling from arXiv, HackerNews, and 3–5 RSS feeds
- Weekly digest generation with opportunity analysis via Claude API
- Simple web UI displaying the digest
- Basic user profile (manually set via a JSON config for now)

### Phase 2 — Interaction
- Interactive chat attached to each story
- Onboarding conversation to generate user profile
- Thumbs up/down feedback on items

### Phase 3 — Intelligence
- Breaking item detection with in-app alerts
- Preference learning from behavior
- Source management UI
- Archive and search

### Phase 4 — Polish
- Mobile optimization
- Periodic preference re-calibration
- GitHub trending + Product Hunt integration
- Email delivery option for weekly digest

---

## Cost Estimate (Monthly, Free/Cheap Target)

| Component | Cost |
|---|---|
| Claude API (haiku for filtering, sonnet for analysis + chat) | ~$5–15/month depending on usage |
| Hosting (Vercel free tier) | $0 |
| Database (Supabase free tier or SQLite) | $0 |
| News/arXiv/HackerNews APIs | $0 |
| Reddit API | $0 (free tier) |
| **Total** | **~$5–15/month** |

If chat usage is heavy, sonnet costs could rise. Swapping chat to haiku-3.5 keeps costs minimal with acceptable quality.

---

## Open Questions / Decisions for Later

- Twitter/X integration: free tier is limited. Nitter scraping is an option but fragile. May be worth skipping v1.
- Email digest: should the weekly digest also be deliverable via email? Easy to add with Resend (free tier).
- Multi-user: not in scope for v1 but the data model should be designed with it in mind.
- Mobile app: not in scope for v1; responsive web is sufficient.
