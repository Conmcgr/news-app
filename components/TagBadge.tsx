import { cn } from '../lib/utils';

const TAG_COLORS: Record<string, string> = {
  'AI × Biotech': 'bg-violet-900/50 text-violet-300 border-violet-800',
  'Foundation Models': 'bg-blue-900/50 text-blue-300 border-blue-800',
  'Dev Tools': 'bg-cyan-900/50 text-cyan-300 border-cyan-800',
  'Developer Tools': 'bg-cyan-900/50 text-cyan-300 border-cyan-800',
  'AI × Fintech': 'bg-amber-900/50 text-amber-300 border-amber-800',
  Funding: 'bg-emerald-900/50 text-emerald-300 border-emerald-800',
  Research: 'bg-indigo-900/50 text-indigo-300 border-indigo-800',
  'Product Launch': 'bg-pink-900/50 text-pink-300 border-pink-800',
  Regulatory: 'bg-orange-900/50 text-orange-300 border-orange-800',
  'Defense Tech': 'bg-red-900/50 text-red-300 border-red-800',
};

const DEFAULT_COLOR = 'bg-zinc-800 text-zinc-300 border-zinc-700';

interface Props {
  tag: string;
}

export function TagBadge({ tag }: Props) {
  const colorClass = TAG_COLORS[tag] || DEFAULT_COLOR;
  return (
    <span
      className={cn(
        'inline-block text-xs px-2 py-0.5 rounded-full border font-medium',
        colorClass
      )}
    >
      {tag}
    </span>
  );
}
