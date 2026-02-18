'use client';

import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserFeedback } from '../lib/types';

interface Props {
  itemId: string;
  initialFeedback: UserFeedback;
}

export function FeedbackButtons({ itemId, initialFeedback }: Props) {
  const [feedback, setFeedback] = useState<UserFeedback>(initialFeedback);
  const [loading, setLoading] = useState(false);

  async function handleFeedback(value: 'up' | 'down') {
    if (loading) return;
    const next: UserFeedback = feedback === value ? null : value;
    setFeedback(next);
    setLoading(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: itemId, feedback: next }),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => handleFeedback('up')}
        disabled={loading}
        className={cn(
          'p-1.5 rounded transition-colors',
          feedback === 'up'
            ? 'text-emerald-400 bg-emerald-400/10'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
        )}
        title="Relevant"
      >
        <ThumbsUp className="w-4 h-4" />
      </button>
      <button
        onClick={() => handleFeedback('down')}
        disabled={loading}
        className={cn(
          'p-1.5 rounded transition-colors',
          feedback === 'down'
            ? 'text-red-400 bg-red-400/10'
            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
        )}
        title="Not relevant"
      >
        <ThumbsDown className="w-4 h-4" />
      </button>
    </div>
  );
}
