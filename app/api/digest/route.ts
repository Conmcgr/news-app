import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  const { supabase } = createRouteClient(request);
  const searchParams = request.nextUrl.searchParams;
  const weekOf = searchParams.get('week_of');

  let query = supabase
    .from('digest_items')
    .select('*')
    .order('score', { ascending: false });

  if (weekOf) {
    query = query.eq('week_of', weekOf);
  } else {
    // Default to most recent week
    const { data: latest } = await supabase
      .from('digest_items')
      .select('week_of')
      .order('week_of', { ascending: false })
      .limit(1)
      .single();

    if (!latest) {
      return NextResponse.json({ items: [], week_of: null });
    }

    query = query.eq('week_of', latest.week_of);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const items = data || [];
  const resolvedWeekOf = items[0]?.week_of || weekOf || null;

  return NextResponse.json({ items, week_of: resolvedWeekOf });
}
