import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Rss, ArchiveIcon, ArrowLeft } from 'lucide-react';
import { DigestItem } from '../../lib/types';
import { TagBadge } from '../../components/TagBadge';
import { RestoreButton } from '../../components/RestoreButton';
import { createPageClient } from '../../lib/supabase-server';

async function getDismissedItems(): Promise<DigestItem[]> {
  try {
    const supabase = await createPageClient();
    const { data, error } = await supabase
      .from('digest_items')
      .select('*')
      .eq('dismissed', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data as DigestItem[]) || [];
  } catch {
    return [];
  }
}

export const revalidate = 0;

export default async function ArchivePage() {
  const items = await getDismissedItems();

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Rss className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-zinc-100 tracking-tight">Tech Intelligence</span>
            <span className="text-zinc-600">/</span>
            <span className="text-sm text-zinc-400 flex items-center gap-1.5">
              <ArchiveIcon className="w-4 h-4" />
              Archive
            </span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to digest
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {items.length === 0 ? (
          <div className="text-center py-24">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mb-4">
              <ArchiveIcon className="w-7 h-7 text-zinc-600" />
            </div>
            <h2 className="text-lg font-medium text-zinc-400 mb-2">Archive is empty</h2>
            <p className="text-sm text-zinc-600">
              Stories you dismiss will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="text-xs text-zinc-600">
                      {format(parseISO(item.week_of), 'MMM d, yyyy')}
                    </span>
                    {(item.tags as string[]).slice(0, 3).map((tag) => (
                      <TagBadge key={tag} tag={tag} />
                    ))}
                  </div>
                  <h3 className="text-sm font-medium text-zinc-300 leading-snug">
                    {item.headline}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.summary.split('\n\n')[0]}</p>
                </div>
                <div className="flex-shrink-0 pt-1">
                  <RestoreButton itemId={item.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
