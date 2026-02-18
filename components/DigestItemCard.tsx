'use client';

import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, MessageSquare, Zap, Archive } from 'lucide-react';
import { DigestItem } from '../lib/types';
import { TagBadge } from './TagBadge';
import { FeedbackButtons } from './FeedbackButtons';
import { ChatPanel } from './ChatPanel';
import { cn } from '../lib/utils';

interface Props {
  item: DigestItem;
  featured?: boolean;
}

export function DigestItemCard({ item, featured = false }: Props) {
  const [expanded, setExpanded] = useState(featured);
  const [chatOpen, setChatOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  async function handleDismiss() {
    setDismissed(true);
    await fetch('/api/dismiss', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, dismissed: true }),
    });
  }

  if (dismissed) return null;

  const sources = item.sources as Array<{ url: string; title: string; type: string }>;

  return (
    <>
      <article
        className={cn(
          'rounded-xl border transition-all',
          featured
            ? 'border-zinc-700 bg-zinc-900'
            : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700'
        )}
      >
        <div className="p-5">
          {/* Top row: score indicator + tags + feedback */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex flex-wrap gap-1.5 items-center">
              {featured && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" />
                  Featured
                </span>
              )}
              {(item.tags as string[]).map((tag) => (
                <TagBadge key={tag} tag={tag} />
              ))}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <FeedbackButtons itemId={item.id} initialFeedback={item.user_feedback} />
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-colors"
                title="Dismiss to archive"
              >
                <Archive className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Headline */}
          <h2
            className={cn(
              'font-semibold leading-snug mb-2',
              featured ? 'text-lg text-zinc-100' : 'text-base text-zinc-200'
            )}
          >
            {item.headline}
          </h2>

          {/* Summary — always visible */}
          <div className="text-sm text-zinc-400 leading-relaxed mb-3 space-y-2">
            {item.summary.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>

          {/* Expand/collapse button */}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors mb-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                Why it matters · Opportunity analysis
              </>
            )}
          </button>
        </div>

        {/* Expandable section */}
        {expanded && (
          <div className="border-t border-zinc-800 px-5 py-4 space-y-4">
            {/* Why it matters */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Why it matters
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{item.why_it_matters}</p>
            </div>

            {/* Opportunity analysis */}
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">
                Opportunity lens
              </h3>
              <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                {item.opportunity_analysis}
              </p>
            </div>

            {/* Sources + actions */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap gap-3">
                {sources.slice(0, 3).map((src, i) => (
                  <a
                    key={i}
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {src.title || new URL(src.url).hostname}
                  </a>
                ))}
              </div>

              <button
                onClick={() => setChatOpen(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-400 hover:text-blue-300 bg-blue-400/10 hover:bg-blue-400/20 border border-blue-400/20 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Ask about this
              </button>
            </div>
          </div>
        )}
      </article>

      {chatOpen && <ChatPanel item={item} onClose={() => setChatOpen(false)} />}
    </>
  );
}
