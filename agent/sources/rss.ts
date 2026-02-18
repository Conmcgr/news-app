import Parser from 'rss-parser';
import { RawItem } from '../../lib/types';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; TechIntelBot/1.0)',
  },
});

interface FeedConfig {
  url: string;
  name: string;
}

export const RSS_FEEDS: FeedConfig[] = [
  // AI / Research newsletters
  { url: 'https://tldr.tech/api/rss/ai', name: 'TLDR AI' },
  { url: 'https://www.interconnects.ai/feed', name: 'Interconnects' },
  { url: 'https://www.deeplearning.ai/the-batch/feed/', name: 'The Batch' },
  { url: 'https://magazine.sebastianraschka.com/feed', name: 'Ahead of AI' },

  // Startup / VC / Business tech
  { url: 'https://techcrunch.com/feed/', name: 'TechCrunch' },
  { url: 'https://venturebeat.com/feed/', name: 'VentureBeat' },
  { url: 'https://a16z.com/feed/', name: 'a16z' },
  { url: 'https://news.crunchbase.com/feed/', name: 'Crunchbase News' },
  { url: 'https://www.ben-evans.com/benedictevans/rss.xml', name: 'Benedict Evans' },
  { url: 'https://www.thediff.co/feed', name: 'The Diff' },
];

async function fetchFeed(feed: FeedConfig, daysBack: number): Promise<RawItem[]> {
  const cutoff = new Date(Date.now() - daysBack * 86400 * 1000);

  try {
    const parsed = await parser.parseURL(feed.url);
    const results: RawItem[] = [];

    for (const item of parsed.items || []) {
      const published = item.pubDate ? new Date(item.pubDate) : new Date(item.isoDate || '');
      if (isNaN(published.getTime())) continue;
      if (published < cutoff) continue;

      const url = item.link || item.guid || '';
      if (!url) continue;

      const rawContent = item.contentSnippet || item.content || item.summary || '';
      const content = `${item.title || ''}\n\n${rawContent.replace(/<[^>]+>/g, '')}`.slice(0, 3000);

      results.push({
        url,
        title: item.title || 'Untitled',
        content,
        published_at: published.toISOString(),
        source_name: feed.name,
        source_type: 'rss',
      });
    }

    console.log(`[RSS:${feed.name}] Fetched ${results.length} items`);
    return results;
  } catch (err) {
    console.error(`[RSS:${feed.name}] Error:`, (err as Error).message);
    return [];
  }
}

export async function fetchRssFeeds(
  feeds: FeedConfig[] = RSS_FEEDS,
  daysBack = 7
): Promise<RawItem[]> {
  const results = await Promise.all(feeds.map((f) => fetchFeed(f, daysBack)));
  return results.flat();
}
