import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function POST() {
  const githubPat = process.env.GITHUB_PAT;
  if (!githubPat) {
    return NextResponse.json({ error: 'GITHUB_PAT not configured' }, { status: 500 });
  }

  // Find the most recent week_of
  const { data: latestWeek } = await supabaseAdmin
    .from('digest_items')
    .select('week_of')
    .order('week_of', { ascending: false })
    .limit(1)
    .single();

  // Delete current week's items so the agent doesn't skip on re-run
  if (latestWeek?.week_of) {
    const { error: deleteError } = await supabaseAdmin
      .from('digest_items')
      .delete()
      .eq('week_of', latestWeek.week_of);

    if (deleteError) {
      console.error('[Refresh] Failed to delete current week items:', deleteError.message);
      return NextResponse.json({ error: 'Failed to clear current digest' }, { status: 500 });
    }

    console.log(`[Refresh] Deleted items for week of ${latestWeek.week_of}`);
  }

  // Trigger the GitHub Actions workflow
  const res = await fetch(
    'https://api.github.com/repos/Conmcgr/news-app/actions/workflows/weekly-digest.yml/dispatches',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${githubPat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref: 'main' }),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    console.error('[Refresh] GitHub API error:', res.status, body);
    return NextResponse.json({ error: 'Failed to trigger workflow' }, { status: 500 });
  }

  console.log('[Refresh] Workflow triggered successfully');
  return NextResponse.json({ success: true });
}
