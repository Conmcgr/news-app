import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { anthropic, MODELS } from '../../../../lib/claude';
import { supabaseAdmin } from '../../../../lib/supabase';

const EXTRACT_PROMPT = `Based on the following onboarding conversation, extract a structured user profile as JSON.

Return ONLY valid JSON in this exact format — no markdown, no explanation:
{
  "interests": [{"domain": "string", "weight": 0.0}],
  "context": "string",
  "goals": ["string"],
  "tracked_entities": ["string"]
}

Rules:
- interests: 5-10 domains. Assign weights 0.5-1.0 based on enthusiasm/priority (1.0 = primary focus, 0.7 = strong interest, 0.5 = mentioned in passing)
- context: 2-3 sentence summary of who they are and what they do
- goals: 3-6 specific goals they want from the digest, written as action statements
- tracked_entities: all companies, labs, funds, researchers, or people they mentioned wanting to follow`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const transcript = (messages as Array<{ role: string; content: string }>)
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    const response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `${EXTRACT_PROMPT}\n\nConversation:\n${transcript}`,
        },
      ],
    });

    const text = (response.content[0] as { type: string; text: string }).text;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Failed to extract profile JSON from conversation');

    const profile = JSON.parse(match[0]);

    // Upsert: update existing row or insert new one
    const { data: existing } = await supabaseAdmin
      .from('user_profile')
      .select('id')
      .limit(1)
      .single();

    let error;
    if (existing) {
      ({ error } = await supabaseAdmin
        .from('user_profile')
        .update({ ...profile, onboarded: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id));
    } else {
      ({ error } = await supabaseAdmin.from('user_profile').insert({ ...profile, onboarded: true }));
    }

    if (error) throw error;

    revalidatePath('/');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
