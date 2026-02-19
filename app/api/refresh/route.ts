import { NextResponse } from 'next/server';
import { anthropic, MODELS } from '../../../lib/claude';
import { supabaseAdmin } from '../../../lib/supabase';
import { fetchArxivFullText } from '../../../lib/arxiv';
import { DigestItem, DigestSource, UserProfile } from '../../../lib/types';

// Allow up to 5 minutes for this route (Vercel Pro)
export const maxDuration = 300;

async function reanalyzeItem(
  item: DigestItem,
  profile: UserProfile
): Promise<{ headline: string; summary: string; why_it_matters: string; opportunity_analysis: string } | null> {
  const sources = (item.sources as DigestSource[]) ?? [];
  const primarySource = sources[0];
  const isPaper = primarySource?.type === 'paper';

  let contentBlock = item.summary; // best proxy for non-paper items
  let contentLabel = 'Stored summary';

  if (isPaper && primarySource?.url?.includes('arxiv.org')) {
    const fullText = await fetchArxivFullText(primarySource.url);
    if (fullText) {
      contentBlock = fullText;
      contentLabel = 'Full paper text';
    }
  }

  const summaryGuidance = isPaper
    ? 'For this research paper: explain (1) what problem it solves, (2) the approach or method, (3) key results and numbers if any, (4) what makes it different from prior work. Do NOT copy the abstract — synthesize in your own words.'
    : 'Cover what was built or announced, how it works at a high level, what makes it different from existing solutions, and any key results, numbers, or quotes worth knowing.';

  const prompt = `You are a senior technology analyst and startup advisor. You're writing for a technically-minded college junior who is part of a VC fund and wants to eventually found or join an early-stage startup.

User context: ${profile.context}
User goals: ${profile.goals?.join('; ')}

Analyze the following ${isPaper ? 'research paper' : 'piece of content'} and return a JSON object. Important: escape ALL newlines inside JSON string values as \\n — do not use literal line breaks inside strings.

{
  "headline": "<plain-language headline, not clickbait, max 100 chars>",
  "summary": "<2 paragraphs separated by \\n\\n. ${summaryGuidance} The reader is technically literate.>",
  "why_it_matters": "<2-3 sentences. Be specific: name the market trend, funding dynamic, or technical shift this connects to. Explain HOW it matters for someone early-career in VC/AI. Avoid generic statements.>",
  "opportunity_analysis": "<3 bullets using the • character, each on its own line (\\n between bullets):\\n• [What this makes newly possible — be specific]\\n• [The specific unmet need or market gap this surfaces — name who has the problem]\\n• [One concrete, specific thing a technical person could build or do to capitalize on this]>"
}

Title: ${item.headline}
Tags: ${(item.tags as string[]).join(', ')}
Sources: ${sources.map((s) => s.url).join(', ')}

${contentLabel}:
${contentBlock}`;

  try {
    const response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as { type: string; text: string }).text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON in response');
    const parsed = JSON.parse(match[0]);

    if (!parsed.opportunity_analysis?.trim()) throw new Error('Empty opportunity_analysis');

    return {
      headline: parsed.headline || item.headline,
      summary: parsed.summary || item.summary,
      why_it_matters: parsed.why_it_matters || item.why_it_matters,
      opportunity_analysis: parsed.opportunity_analysis,
    };
  } catch (err) {
    console.error(`[Refresh] Failed to re-analyze "${item.headline}":`, (err as Error).message);
    return null;
  }
}

export async function POST() {
  // Fetch current profile and latest week in parallel
  const [{ data: profileData, error: profileError }, { data: latestWeek }] = await Promise.all([
    supabaseAdmin.from('user_profile').select('*').single(),
    supabaseAdmin
      .from('digest_items')
      .select('week_of')
      .order('week_of', { ascending: false })
      .limit(1)
      .single(),
  ]);

  if (profileError || !profileData) {
    return NextResponse.json({ error: 'No user profile found' }, { status: 400 });
  }

  if (!latestWeek) {
    return NextResponse.json({ error: 'No digest items found' }, { status: 404 });
  }

  const profile = profileData as UserProfile;
  const weekOf = latestWeek.week_of;

  // Fetch all items for the current week
  const { data: items, error: itemsError } = await supabaseAdmin
    .from('digest_items')
    .select('*')
    .eq('week_of', weekOf)
    .order('score', { ascending: false });

  if (itemsError || !items || items.length === 0) {
    return NextResponse.json({ error: 'No items found for current week' }, { status: 404 });
  }

  console.log(`[Refresh] Re-analyzing ${items.length} items for week of ${weekOf}`);

  let updated = 0;
  let failed = 0;

  for (const item of items as DigestItem[]) {
    console.log(`[Refresh] Processing: ${item.headline.slice(0, 60)}...`);
    const result = await reanalyzeItem(item, profile);

    if (result) {
      const { error: updateError } = await supabaseAdmin
        .from('digest_items')
        .update(result)
        .eq('id', item.id);

      if (updateError) {
        console.error(`[Refresh] DB update failed for ${item.id}:`, updateError.message);
        failed++;
      } else {
        updated++;
      }
    } else {
      failed++;
    }

    // Small delay between Sonnet calls
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log(`[Refresh] Done: ${updated} updated, ${failed} failed`);
  return NextResponse.json({ success: true, updated, failed, weekOf });
}
