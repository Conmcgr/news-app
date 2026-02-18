import { RawItem } from '../../lib/types';

/**
 * Jaccard similarity on word sets (title-based, no embeddings needed for v1)
 */
function jaccardSimilarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 3) // skip short stop-word candidates
    );

  const setA = tokenize(a);
  const setB = tokenize(b);

  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);

  return intersection.size / union.size;
}

/**
 * Deduplicate raw items by:
 * 1. Exact URL match (keep first seen)
 * 2. Title Jaccard similarity > 0.5 (keep higher-priority source)
 */
export function deduplicateItems(items: RawItem[]): RawItem[] {
  const seenUrls = new Set<string>();
  const kept: RawItem[] = [];

  for (const item of items) {
    // Normalize URL (strip trailing slash, www, query params for dedup)
    const normalizedUrl = item.url
      .replace(/^https?:\/\/(www\.)?/, '')
      .replace(/\?.*$/, '')
      .replace(/\/$/, '')
      .toLowerCase();

    if (seenUrls.has(normalizedUrl)) continue;

    // Check title similarity against already-kept items
    const isDuplicate = kept.some((k) => {
      const sim = jaccardSimilarity(item.title, k.title);
      return sim > 0.5;
    });

    if (isDuplicate) continue;

    seenUrls.add(normalizedUrl);
    kept.push(item);
  }

  console.log(`[Dedupe] ${items.length} → ${kept.length} items after deduplication`);
  return kept;
}
