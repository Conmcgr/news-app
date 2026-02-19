/**
 * Fetches the full text of an arXiv paper from its HTML version.
 * Returns null if unavailable or if the result is too short to be useful.
 */
export async function fetchArxivFullText(arxivUrl: string): Promise<string | null> {
  try {
    // Extract paper ID from URLs like http://arxiv.org/abs/2301.12345v1
    const idMatch = arxivUrl.match(/arxiv\.org\/abs\/([^\s]+)/i);
    if (!idMatch) return null;

    const paperId = idMatch[1];
    const htmlUrl = `https://arxiv.org/html/${paperId}`;

    const res = await fetch(htmlUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; digest-agent/1.0)' },
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return null;

    const html = await res.text();

    // Remove non-content elements
    const stripped = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<figure[\s\S]*?<\/figure>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '');

    // Cut off at references/bibliography section
    const refsIndex = stripped.search(
      /<section[^>]*id=["'](?:bib|references|bibliography)["']/i
    );
    const mainContent = refsIndex > 0 ? stripped.slice(0, refsIndex) : stripped;

    const text = mainContent
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#x27;/gi, "'")
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return text.length > 1000 ? text.slice(0, 12000) : null;
  } catch (err) {
    console.error('[arxiv] fetchArxivFullText error:', (err as Error).message);
    return null;
  }
}
