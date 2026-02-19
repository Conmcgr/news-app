'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'triggered' | 'error'>('idle');

  async function handleRefresh() {
    const confirmed = window.confirm(
      'Fetch fresh stories and regenerate the digest with your current preferences?\n\nThis runs the full pipeline in the background (~10 min) and costs ~$1–2 in API usage.'
    );
    if (!confirmed) return;

    setState('loading');

    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refresh failed');
      setState('triggered');
    } catch (err) {
      console.error('Refresh error:', err);
      setState('error');
      setTimeout(() => setState('idle'), 4000);
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={state === 'loading' || state === 'triggered'}
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      title="Re-fetch all sources and regenerate the digest"
    >
      <RefreshCw className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`} />
      {state === 'idle' && (
        <>Refresh <span className="text-zinc-500 text-xs">~$2</span></>
      )}
      {state === 'loading' && 'Starting…'}
      {state === 'triggered' && 'Generating — check back in ~10 min'}
      {state === 'error' && 'Failed — try again'}
    </button>
  );
}
