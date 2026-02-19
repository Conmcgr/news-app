'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

export function RefreshButton() {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{ updated: number; failed: number } | null>(null);

  async function handleRefresh() {
    const confirmed = window.confirm(
      'Re-analyze this week\'s digest with your current preferences and improved prompts?\n\nThis takes 2–4 minutes and costs ~$0.50–1 in API usage.'
    );
    if (!confirmed) return;

    setState('loading');
    setResult(null);

    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Refresh failed');

      setResult({ updated: data.updated, failed: data.failed });
      setState('done');

      // Reload the page after a short delay so updated items appear
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error('Refresh error:', err);
      setState('error');
      setTimeout(() => setState('idle'), 3000);
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={state === 'loading'}
      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title="Re-analyze this week's digest with your current preferences"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${state === 'loading' ? 'animate-spin' : ''}`} />
      {state === 'idle' && 'Refresh'}
      {state === 'loading' && 'Refreshing…'}
      {state === 'done' && result && `Done (${result.updated} updated)`}
      {state === 'error' && 'Failed'}
    </button>
  );
}
