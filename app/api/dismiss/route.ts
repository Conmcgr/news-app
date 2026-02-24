import { NextRequest, NextResponse } from 'next/server';
import { createRouteClient } from '../../../lib/supabase-server';

export async function PATCH(request: NextRequest) {
  const { supabase } = createRouteClient(request);
  const { id, dismissed } = await request.json() as { id: string; dismissed: boolean };

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const { error } = await supabase
    .from('digest_items')
    .update({ dismissed })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
