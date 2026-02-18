import * as cheerio from 'cheerio';
import { RawItem } from '../../lib/types';

const TRENDING_URL = 'https://github.com/trending';

export async function fetchGithubTrending(daysBack = 7): Promise<RawItem[]> {
  // GitHub trending has three windows: daily, weekly, monthly — weekly fits best
  const url = `${TRENDING_URL}?since=weekly`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; TechIntelBot/1.0)' },
    });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: RawItem[] = [];
    const cutoff = new Date(Date.now() - daysBack * 86400 * 1000);

    $('article.Box-row').each((_, el) => {
      const repoPath = $(el).find('h2 a').attr('href')?.trim();
      if (!repoPath) return;

      const repoUrl = `https://github.com${repoPath}`;
      const repoName = repoPath.replace(/^\//, ''); // owner/repo

      const description = $(el).find('p').first().text().trim();
      const language = $(el).find('[itemprop="programmingLanguage"]').text().trim();

      // Stars gained this week
      const starsText = $(el)
        .find('span.d-inline-block.float-sm-right')
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      // Total stars
      const totalStars = $(el)
        .find('a[href$="/stargazers"]')
        .text()
        .replace(/,/g, '')
        .trim();

      const content = [
        `GitHub repository: ${repoName}`,
        description ? `Description: ${description}` : '',
        language ? `Primary language: ${language}` : '',
        totalStars ? `Total stars: ${totalStars}` : '',
        starsText ? `Trending: ${starsText}` : '',
      ]
        .filter(Boolean)
        .join('\n');

      // Use start-of-week as published_at since GitHub trending doesn't expose dates
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);
      if (weekStart < cutoff) return;

      results.push({
        url: repoUrl,
        title: `${repoName}${description ? ` — ${description}` : ''}`,
        content,
        published_at: weekStart.toISOString(),
        source_name: 'GitHub Trending',
        source_type: 'github',
      });
    });

    console.log(`[GitHub Trending] Fetched ${results.length} repos`);
    return results;
  } catch (err) {
    console.error('[GitHub Trending] Error:', (err as Error).message);
    return [];
  }
}
