import { Rss, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FreshOnboard } from './FreshOnboard';
import { EditProfile } from './EditProfile';
import { UserProfile } from '../../lib/types';
import { createPageClient } from '../../lib/supabase-server';

async function getProfile(): Promise<(UserProfile & { onboarded: boolean }) | null> {
  try {
    const supabase = await createPageClient();
    const { data } = await supabase
      .from('user_profile')
      .select('*')
      .limit(1)
      .single();
    return data;
  } catch {
    return null;
  }
}

export const revalidate = 0;

export default async function OnboardPage() {
  const profile = await getProfile();
  const isOnboarded = profile?.onboarded === true;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      <header className="border-b border-zinc-800 sticky top-0 z-10 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Rss className="w-5 h-5 text-blue-400" />
            <span className="font-semibold text-zinc-100 tracking-tight">Tech Intelligence</span>
            <span className="text-zinc-600 text-sm ml-1">
              / {isOnboarded ? 'Edit profile' : 'Profile setup'}
            </span>
          </div>
          {isOnboarded && (
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to digest
            </Link>
          )}
        </div>
      </header>

      {isOnboarded && profile ? (
        <EditProfile initialProfile={profile} />
      ) : (
        <FreshOnboard />
      )}
    </div>
  );
}
