import { RawItem } from '../../lib/types';

const ARXIV_BASE = 'https://export.arxiv.org/api/query';

// Categories to search
const CATEGORIES = ['cs.AI', 'cs.LG', 'cs.CL'];

function parseArxivXml(xml: string): RawItem[] {
  const entries: RawItem[] = [];

  // Simple regex-based XML parsing (avoids heavy XML library dependency)
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const idMatch = entry.match(/<id>(.*?)<\/id>/);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
    const publishedMatch = entry.match(/<published>(.*?)<\/published>/);

    if (!idMatch || !titleMatch || !summaryMatch || !publishedMatch) continue;

    const url = idMatch[1].trim();
    const title = titleMatch[1].replace(/\s+/g, ' ').trim();
    const summary = summaryMatch[1].replace(/\s+/g, ' ').trim();
    const published_at = publishedMatch[1].trim();

    // Extract authors
    const authorMatches = entry.matchAll(/<author>[\s\S]*?<name>(.*?)<\/name>[\s\S]*?<\/author>/g);
    const authors = Array.from(authorMatches)
      .map((m) => m[1])
      .slice(0, 3)
      .join(', ');

    const content = `${title}\n\nAuthors: ${authors}\n\n${summary}`.slice(0, 3000);

    entries.push({
      url,
      title,
      content,
      published_at,
      source_name: 'arXiv',
      source_type: 'paper',
    });
  }

  return entries;
}

export async function fetchArxiv(daysBack = 7): Promise<RawItem[]> {
  const results: RawItem[] = [];
  const seen = new Set<string>();

  for (const category of CATEGORIES) {
    const params = new URLSearchParams({
      search_query: `cat:${category}`,
      sortBy: 'submittedDate',
      sortOrder: 'descending',
      max_results: '30',
    });

    try {
      const res = await fetch(`${ARXIV_BASE}?${params}`);
      const xml = await res.text();
      const items = parseArxivXml(xml);

      const cutoff = new Date(Date.now() - daysBack * 86400 * 1000);

      for (const item of items) {
        if (seen.has(item.url)) continue;
        if (new Date(item.published_at) < cutoff) continue;
        seen.add(item.url);
        results.push(item);
      }
    } catch (err) {
      console.error(`[arXiv] Error fetching ${category}:`, err);
    }
  }

  console.log(`[arXiv] Fetched ${results.length} papers`);
  return results;
}
