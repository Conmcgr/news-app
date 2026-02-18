import { RawItem } from '../../lib/types';

const HN_BASE = 'https://hacker-news.firebaseio.com/v0';

interface HNItem {
  id: number;
  title: string;
  url?: string;
  text?: string;
  score: number;
  time: number;
  type: string;
  descendants?: number;
}

async function fetchItem(id: number): Promise<HNItem | null> {
  try {
    const res = await fetch(`${HN_BASE}/item/${id}.json`);
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchHackerNews(daysBack = 7): Promise<RawItem[]> {
  const cutoff = Date.now() / 1000 - daysBack * 86400;

  // Fetch top stories + Ask HN (newstories has more variety)
  const [topRes, newRes] = await Promise.all([
    fetch(`${HN_BASE}/topstories.json`),
    fetch(`${HN_BASE}/newstories.json`),
  ]);

  const [topIds, newIds]: number[][] = await Promise.all([
    topRes.json(),
    newRes.json(),
  ]);

  // Combine and deduplicate, take top 60
  const combined = Array.from(new Set([...topIds.slice(0, 40), ...newIds.slice(0, 30)])).slice(0, 60);

  const items = await Promise.all(combined.map(fetchItem));

  const results: RawItem[] = [];

  for (const item of items) {
    if (!item) continue;
    if (item.time < cutoff) continue;
    if (item.type !== 'story') continue;
    // Must have title and either a URL or text (Ask HN)
    if (!item.title) continue;

    const url = item.url || `https://news.ycombinator.com/item?id=${item.id}`;
    const content = item.text
      ? `${item.title}\n\n${item.text.replace(/<[^>]+>/g, '')}` // strip HTML from Ask HN text
      : item.title;

    results.push({
      url,
      title: item.title,
      content: content.slice(0, 2000),
      published_at: new Date(item.time * 1000).toISOString(),
      source_name: 'Hacker News',
      source_type: 'article',
    });
  }

  console.log(`[HackerNews] Fetched ${results.length} items`);
  return results;
}
