import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Rss, Zap, Settings, ArchiveIcon } from 'lucide-react';
import { DigestItem } from '../lib/types';
import { DigestItemCard } from '../components/DigestItemCard';

async function getDigest(): Promise<{ items: DigestItem[]; week_of: string | null }> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: latest } = await supabase
      .from('digest_items')
      .select('week_of')
      .order('week_of', { ascending: false })
      .limit(1)
      .single();

    if (!latest) return { items: [], week_of: null };

    const { data, error } = await supabase
      .from('digest_items')
      .select('*')
      .eq('week_of', latest.week_of)
      .eq('dismissed', false)
      .order('score', { ascending: false });

    if (error) throw error;
    return { items: (data as DigestItem[]) || [], week_of: latest.week_of };
  } catch {
    return { items: [], week_of: null };
  }
}

export const revalidate = 3600;

export default async function DigestPage() {
  const { items, week_of } = await getDigest();

  const featured = items.filter((i) => i.is_featured);
  const rest = items.filter((i) => !i.is_featured);

  const weekLabel = week_of
    ? `Week of ${format(parseISO(week_of), 'MMMM d, yyyy')}`
    : null;

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Rss className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-zinc-100 tracking-tight">Tech Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            {weekLabel && (
              <span className="text-xs text-zinc-500">{weekLabel}</span>
            )}
            <Link
              href="/archive"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArchiveIcon className="w-3.5 h-3.5" />
              Archive
            </Link>
            <Link
              href="/onboard"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Edit profile
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {items.length === 0 && (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mb-4">
              <Rss className="w-7 h-7 text-zinc-600" />
            </div>
            <h2 className="text-lg font-medium text-zinc-400 mb-2">No digest yet</h2>
            <p className="text-sm text-zinc-600 max-w-sm mx-auto">
              Run the aggregation agent to generate this week&apos;s digest.
            </p>
            <code className="inline-block mt-4 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-3 py-2 rounded-lg">
              bun run agent
            </code>
          </div>
        )}

        {featured.length > 0 && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-4 h-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Top stories this week
              </h2>
            </div>
            <div className="space-y-4">
              {featured.map((item) => (
                <DigestItemCard key={item.id} item={item} featured />
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-4 h-4 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
              </div>
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                Also this week
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rest.map((item) => (
                <DigestItemCard key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-zinc-800 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 text-center text-xs text-zinc-600">
          Powered by Claude · Updated weekly
        </div>
      </footer>
    </div>
  );
}
