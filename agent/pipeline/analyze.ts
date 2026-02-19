import { anthropic, MODELS } from '../../lib/claude';
import { ScoredItem, AnalyzedItem, UserProfile } from '../../lib/types';
import { fetchArxivFullText } from '../../lib/arxiv';

const TOP_N = 15;

async function analyzeItem(item: ScoredItem, profile: UserProfile): Promise<AnalyzedItem> {
  const isPaper = item.source_type === 'paper';
  let contentBlock = item.content.slice(0, 3000);
  let contentLabel = 'Content';

  if (isPaper) {
    const fullText = await fetchArxivFullText(item.url);
    if (fullText) {
      contentBlock = fullText;
      contentLabel = 'Full paper text';
      console.log(`[Analyze] Fetched full paper for: ${item.title.slice(0, 60)}`);
    } else {
      contentLabel = 'Abstract only (full paper unavailable)';
      console.log(`[Analyze] Using abstract for: ${item.title.slice(0, 60)}`);
    }
  }

  const summaryGuidance = isPaper
    ? 'For this research paper: explain (1) what problem it solves, (2) the approach or method, (3) key results and numbers if any, (4) what makes it different from prior work. Do NOT copy the abstract — synthesize from the full paper in your own words.'
    : 'Cover what was built or announced, how it works at a high level, what makes it different from existing solutions, and any key results, numbers, or quotes worth knowing.';

  const prompt = `You are a senior technology analyst and startup advisor. You're writing for a technically-minded college junior who is part of a VC fund and wants to eventually found or join an early-stage startup.

User context: ${profile.context}
User goals: ${profile.goals.join('; ')}

Analyze the following ${isPaper ? 'research paper' : 'piece of content'} and return a JSON object. Important: escape ALL newlines inside JSON string values as \\n — do not use literal line breaks inside strings.

{
  "headline": "<plain-language headline, not clickbait, max 100 chars>",
  "summary": "<2 paragraphs separated by \\n\\n. ${summaryGuidance} The reader is technically literate — don't over-explain basics but give enough context that the paragraph stands alone.>",
  "why_it_matters": "<2-3 sentences. Be specific: name the market trend, funding dynamic, or technical shift this connects to. Explain HOW it matters for someone early-career in VC/AI — what should they watch, who will win, what is at stake. Avoid generic statements like 'this is an important development'.>",
  "opportunity_analysis": "<3 bullets using the • character, each on its own line (\\n between bullets):\\n• [What this makes newly possible — be specific about the capability or unlock]\\n• [The specific unmet need or market gap this surfaces — name who has the problem]\\n• [One concrete, specific thing a technical person could build or do to capitalize on this]>"
}

Title: ${item.title}
Source: ${item.source_name}
Published: ${item.published_at}
Tags: ${item.tags.join(', ')}

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
    if (!match) throw new Error('No JSON object found in response');
    const parsed = JSON.parse(match[0]);

    if (!parsed.opportunity_analysis || parsed.opportunity_analysis.trim().length < 10) {
      throw new Error('opportunity_analysis missing or empty');
    }

    return {
      ...item,
      headline: parsed.headline || item.title,
      summary: parsed.summary || '',
      why_it_matters: parsed.why_it_matters || '',
      opportunity_analysis: parsed.opportunity_analysis,
      is_featured: false,
    };
  } catch (err) {
    console.error(`[Analyze] Failed to analyze "${item.title}":`, (err as Error).message);
    return {
      ...item,
      headline: item.title,
      summary: item.content.slice(0, 500),
      why_it_matters: item.relevance_reason,
      opportunity_analysis: '',
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

  console.log(
    `[Analyze] Completed ${results.length} items (${results.filter((i) => i.is_featured).length} featured)`
  );
  return results;
}
