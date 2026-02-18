import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, feedback } = body as { id: string; feedback: 'up' | 'down' | null };

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 });
  }

  if (feedback !== null && feedback !== 'up' && feedback !== 'down') {
    return NextResponse.json({ error: 'feedback must be "up", "down", or null' }, { status: 400 });
  }

  const { error } = await supabase
    .from('digest_items')
    .update({ user_feedback: feedback })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
