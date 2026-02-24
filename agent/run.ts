/**
 * Main aggregation agent entry point.
 * Run with: bun run agent/run.ts
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local when running locally
config({ path: resolve(process.cwd(), '.env.local') });

import { fetchHackerNews } from './sources/hackernews';
import { fetchArxiv } from './sources/arxiv';
import { fetchRssFeeds } from './sources/rss';
import { fetchGithubTrending } from './sources/github';
import { deduplicateItems } from './pipeline/dedupe';
import { scoreItems } from './pipeline/score';
import { analyzeTopItems } from './pipeline/analyze';
import { supabaseAdmin } from '../lib/supabase';
import { UserProfile, RawItem, AnalyzedItem, DigestSource } from '../lib/types';

function getWeekOf(): string {
  // Returns the Sunday of the current week (ISO date string)
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

function buildFeedbackContext(feedbackItems: { tags: unknown; user_feedback: string }[]): string {
  if (!feedbackItems || feedbackItems.length === 0) return '';

  const countTags = (tags: string[]) =>
    tags.reduce<Record<string, number>>((acc, t) => ({ ...acc, [t]: (acc[t] || 0) + 1 }), {});

  const upTags = feedbackItems.filter((i) => i.user_feedback === 'up').flatMap((i) => i.tags as string[]);
  const downTags = feedbackItems.filter((i) => i.user_feedback === 'down').flatMap((i) => i.tags as string[]);
  const upTop = Object.entries(countTags(upTags)).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);
  const downTop = Object.entries(countTags(downTags)).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([t]) => t);

  const parts = [];
  if (upTop.length > 0) parts.push(`Topics user has upvoted: ${upTop.join(', ')}`);
  if (downTop.length > 0) parts.push(`Topics user has downvoted: ${downTop.join(', ')}`);
  return parts.join('\n');
}

async function runForUser(profile: UserProfile, deduped: RawItem[], weekOf: string): Promise<void> {
  const userId = profile.user_id!;
  console.log(`\n--- Running for user ${userId} ---`);

  // Check if we already have items for this week + user
  const { data: existing } = await supabaseAdmin
    .from('digest_items')
    .select('id')
    .eq('week_of', weekOf)
    .eq('user_id', userId)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`  Items already exist for week of ${weekOf}. Skipping.`);
    return;
  }

  // Load feedback history for this user
  const { data: feedbackItems } = await supabaseAdmin
    .from('digest_items')
    .select('tags, user_feedback')
    .eq('user_id', userId)
    .not('user_feedback', 'is', null)
    .order('created_at', { ascending: false })
    .limit(100);

  const feedbackContext = buildFeedbackContext(feedbackItems ?? []);
  if (feedbackContext) {
    console.log(`  Feedback context loaded`);
  }

  // Score
  console.log(`  Scoring ${deduped.length} items...`);
  const scored = await scoreItems(deduped, profile, feedbackContext);

  if (scored.length === 0) {
    console.log('  No items passed scoring threshold. Skipping.');
    return;
  }

  // Analyze
  console.log(`  Analyzing top items...`);
  const analyzed = await analyzeTopItems(scored, profile);

  // Build rows
  const rows = analyzed.map((item: AnalyzedItem) => {
    const sources: DigestSource[] = [
      {
        url: item.url,
        title: item.title,
        type: item.source_type,
        published_at: item.published_at,
      },
    ];

    return {
      week_of: weekOf,
      headline: item.headline,
      summary: item.summary,
      why_it_matters: item.why_it_matters,
      opportunity_analysis: item.opportunity_analysis,
      sources,
      tags: item.tags,
      score: item.score,
      is_featured: item.is_featured,
      is_breaking: false,
      user_id: userId,
    };
  });

  const { data, error } = await supabaseAdmin.from('digest_items').insert(rows).select('id');

  if (error) {
    console.error(`  Supabase insert error for user ${userId}:`, error);
    return;
  }

  console.log(`  Inserted ${data?.length || 0} items.`);
}

async function run() {
  console.log('=== Tech Intelligence Agent Starting ===');
  const weekOf = getWeekOf();
  console.log(`Week of: ${weekOf}`);

  // --- Step 1: Fetch from all sources (once, shared across all users) ---
  console.log('\n[1/4] Fetching from sources...');
  const [hnItems, arxivItems, rssItems, githubItems] = await Promise.all([
    fetchHackerNews(7),
    fetchArxiv(7),
    fetchRssFeeds(undefined, 7),
    fetchGithubTrending(7),
  ]);

  const allRaw = [...hnItems, ...arxivItems, ...rssItems, ...githubItems];
  console.log(`Total raw items: ${allRaw.length}`);

  // --- Step 2: Deduplicate (once) ---
  console.log('\n[2/4] Deduplicating...');
  const deduped = deduplicateItems(allRaw);
  console.log(`Deduped items: ${deduped.length}`);

  // --- Step 3: Load all onboarded users ---
  console.log('\n[3/4] Loading onboarded users...');
  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from('user_profile')
    .select('*')
    .eq('onboarded', true)
    .not('user_id', 'is', null);

  if (profilesError) {
    console.error('Failed to load user profiles:', profilesError);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('No onboarded users found. Exiting.');
    process.exit(0);
  }

  console.log(`Found ${profiles.length} onboarded user(s).`);

  // --- Step 4: Score + analyze + insert per user ---
  console.log('\n[4/4] Running per-user pipeline...');
  for (const profile of profiles as UserProfile[]) {
    await runForUser(profile, deduped, weekOf);
  }

  console.log(`\n=== Done! Processed ${profiles.length} user(s) for week of ${weekOf} ===`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
