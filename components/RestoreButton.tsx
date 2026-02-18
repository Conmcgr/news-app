'use client';

import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

export function RestoreButton({ itemId }: { itemId: string }) {
  const [restored, setRestored] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRestore() {
    setLoading(true);
    await fetch('/api/dismiss', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: itemId, dismissed: false }),
    });
    setRestored(true);
    setLoading(false);
  }

  if (restored) {
    return <span className="text-xs text-zinc-500 italic">Restored</span>;
  }

  return (
    <button
      onClick={handleRestore}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
    >
      <RotateCcw className="w-3.5 h-3.5" />
      Restore
    </button>
  );
}
