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
import { deduplicateItems } from './pipeline/dedupe';
import { scoreItems } from './pipeline/score';
import { analyzeTopItems } from './pipeline/analyze';
import { supabaseAdmin } from '../lib/supabase';
import { UserProfile, AnalyzedItem, DigestSource } from '../lib/types';

import profileJson from '../config/profile.json';

function getWeekOf(): string {
  // Returns the Sunday of the current week (ISO date string)
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  d.setDate(d.getDate() - day);
  return d.toISOString().split('T')[0];
}

async function run() {
  console.log('=== Tech Intelligence Agent Starting ===');
  const weekOf = getWeekOf();
  console.log(`Week of: ${weekOf}`);

  // Load user profile (from config file for Phase 1)
  const profile: UserProfile = profileJson as UserProfile;
  console.log(`Loaded profile: ${profile.interests.length} interests, ${profile.tracked_entities.length} tracked entities`);

  // --- Step 1: Fetch from all sources ---
  console.log('\n[1/5] Fetching from sources...');
  const [hnItems, arxivItems, rssItems] = await Promise.all([
    fetchHackerNews(7),
    fetchArxiv(7),
    fetchRssFeeds(undefined, 7),
  ]);

  const allRaw = [...hnItems, ...arxivItems, ...rssItems];
  console.log(`Total raw items: ${allRaw.length}`);

  // --- Step 2: Deduplicate ---
  console.log('\n[2/5] Deduplicating...');
  const deduped = deduplicateItems(allRaw);

  // --- Step 3: Score with Haiku ---
  console.log('\n[3/5] Scoring with Claude Haiku...');
  const scored = await scoreItems(deduped, profile);

  if (scored.length === 0) {
    console.log('No items passed scoring threshold. Exiting.');
    process.exit(0);
  }

  // --- Step 4: Analyze top items with Sonnet ---
  console.log('\n[4/5] Analyzing top items with Claude Sonnet...');
  const analyzed = await analyzeTopItems(scored, profile);

  // --- Step 5: Write to Supabase ---
  console.log('\n[5/5] Writing to Supabase...');

  // Check if we already have items for this week
  const { data: existing } = await supabaseAdmin
    .from('digest_items')
    .select('id')
    .eq('week_of', weekOf)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`Items already exist for week of ${weekOf}. Skipping insert.`);
    console.log('To re-run, delete existing items first or change the week.');
    process.exit(0);
  }

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
    };
  });

  const { data, error } = await supabaseAdmin.from('digest_items').insert(rows).select('id');

  if (error) {
    console.error('Supabase insert error:', error);
    process.exit(1);
  }

  console.log(`\n=== Done! Inserted ${data?.length || 0} items for week of ${weekOf} ===`);
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
