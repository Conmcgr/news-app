import { anthropic, MODELS } from '../../lib/claude';
import { ScoredItem, AnalyzedItem, UserProfile } from '../../lib/types';

const TOP_N = 15;

async function analyzeItem(item: ScoredItem, profile: UserProfile): Promise<AnalyzedItem> {
  const prompt = `You are a senior technology analyst and startup advisor. You're writing for a technically-minded college junior who is part of a VC fund and wants to eventually found or join an early-stage startup.

User context: ${profile.context}
User goals: ${profile.goals.join('; ')}

Analyze the following piece of content and respond in JSON only (no markdown):

{
  "headline": "<plain-language headline, not clickbait, max 100 chars>",
  "summary": "<1-2 paragraphs. Readable, factual prose that covers everything important from the source — what was built or found, how it works at a high level, what makes it different from prior work, and any key results or numbers worth knowing. The reader is technically literate; don't over-explain basics but do give enough context that the paragraph stands on its own. Do not copy or lightly paraphrase the source text — synthesize it in your own words. Use \\n\\n to separate paragraphs.>",
  "why_it_matters": "<1-2 sentences on why this is significant for someone early-career in VC and AI>",
  "opportunity_analysis": "<3 short bullets (use • as bullet character, no headers):\n• What this makes newly possible or reveals\n• The gap or unmet need it surfaces\n• One concrete thing someone technical could do to act on this>"
}

Content:
Title: ${item.title}
Source: ${item.source_name}
Published: ${item.published_at}
Tags: ${item.tags.join(', ')}

${item.content.slice(0, 2500)}`;

  try {
    const response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as { type: string; text: string }).text;
    // Extract the JSON object regardless of surrounding markdown or preamble
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in response');
    const parsed = JSON.parse(match[0]);

    return {
      ...item,
      headline: parsed.headline || item.title,
      summary: parsed.summary || '',
      why_it_matters: parsed.why_it_matters || '',
      opportunity_analysis: parsed.opportunity_analysis || '',
      is_featured: false, // will be set after ranking
    };
  } catch (err) {
    console.error(`[Analyze] Failed to analyze "${item.title}":`, (err as Error).message);
    // Fallback: use raw content
    return {
      ...item,
      headline: item.title,
      summary: item.content.slice(0, 500),
      why_it_matters: item.relevance_reason,
      opportunity_analysis: 'Analysis unavailable.',
      is_featured: false,
    };
  }
}

export async function analyzeTopItems(
  items: ScoredItem[],
  profile: UserProfile
): Promise<AnalyzedItem[]> {
  const top = items.slice(0, TOP_N);
  const results: AnalyzedItem[] = [];

  // Process sequentially to avoid rate limits on Sonnet
  for (const item of top) {
    console.log(`[Analyze] Processing: ${item.title.slice(0, 60)}...`);
    const analyzed = await analyzeItem(item, profile);
    results.push(analyzed);
    await new Promise((r) => setTimeout(r, 300));
  }

  // Mark top 5 as featured
  results.slice(0, 5).forEach((item) => {
    item.is_featured = true;
  });

  console.log(`[Analyze] Completed analysis for ${results.length} items (${results.filter((i) => i.is_featured).length} featured)`);
  return results;
}
