import { anthropic, MODELS } from '../../lib/claude';
import { RawItem, ScoredItem, UserProfile } from '../../lib/types';

const SCORE_THRESHOLD = 5;

interface ScoreResponse {
  score: number;
  tags: string[];
  relevance_reason: string;
}

async function scoreItem(item: RawItem, profile: UserProfile, feedbackContext: string): Promise<ScoreResponse | null> {
  const prompt = `You are an opportunity analyst for a technically-minded college student interested in founding companies and making early-stage investments, with a focus on AI and applied AI at the intersection of fields like biotech, fintech, and developer tools.

User context: ${profile.context}
User interests (weighted): ${profile.interests.map((i) => `${i.domain} (${i.weight})`).join(', ')}
User goals: ${profile.goals.join('; ')}
Tracked entities: ${profile.tracked_entities.join(', ')}
${feedbackContext ? `\nUser feedback history (calibrate scores accordingly):\n${feedbackContext}` : ''}
Score the following piece of content from 0-10 on opportunity signal. Consider:
- Relevance to the user's interests (most important)
- Novelty — is this genuinely new information or just commentary on old news?
- Opportunity signal — does this create a gap, enable something new, or indicate momentum?
- Practical applicability — prioritize real products, launches, funding, and tools over pure academic theory. A research paper only scores ≥7 if it has obvious near-term application to real products or markets. Dense theoretical work with no clear application path should score ≤5 regardless of novelty.

Respond in JSON only (no markdown):
{
  "score": <0-10 float>,
  "tags": [<2-4 domain/type tags, e.g. "AI × Biotech", "Foundation Models", "Research", "Funding">],
  "relevance_reason": "<1 sentence why this is or isn't relevant>"
}

Content:
Title: ${item.title}
Source: ${item.source_name}
Published: ${item.published_at}

${item.content.slice(0, 1500)}`;

  try {
    const response = await anthropic.messages.create({
      model: MODELS.haiku,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = (response.content[0] as { type: string; text: string }).text;
    // Extract the JSON object regardless of surrounding markdown or preamble
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found in response');
    return JSON.parse(match[0]) as ScoreResponse;
  } catch (err) {
    console.error(`[Score] Failed to score "${item.title}":`, (err as Error).message);
    return null;
  }
}

export async function scoreItems(items: RawItem[], profile: UserProfile, feedbackContext = ''): Promise<ScoredItem[]> {
  const results: ScoredItem[] = [];

  // Process in batches of 3 with 4s delay → ~45 req/min (under the 50/min limit)
  const batchSize = 3;
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const scores = await Promise.all(batch.map((item) => scoreItem(item, profile, feedbackContext)));

    for (let j = 0; j < batch.length; j++) {
      const score = scores[j];
      if (!score) continue;
      if (score.score < SCORE_THRESHOLD) continue;

      results.push({
        ...batch[j],
        score: score.score,
        tags: score.tags,
        relevance_reason: score.relevance_reason,
      });
    }

    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, 4000));
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  console.log(`[Score] ${items.length} items → ${results.length} passed threshold (≥${SCORE_THRESHOLD})`);
  return results;
}
