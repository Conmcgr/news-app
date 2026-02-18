import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODELS } from '../../../../lib/claude';
import { supabaseAdmin } from '../../../../lib/supabase';
import { UserProfile } from '../../../../lib/types';

export async function POST(req: NextRequest) {
  try {
    const { messages, currentProfile } = await req.json() as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
      currentProfile: UserProfile;
    };

    const systemPrompt = `You are helping a user update their personal tech intelligence digest profile.

Current profile:
${JSON.stringify(currentProfile, null, 2)}

When the user requests a change (e.g. "remove Defense Tech", "add Sequoia to tracked entities", "change my context to..."):
1. Apply the change to the profile
2. Respond with a brief confirmation (1-2 sentences)
3. Output the COMPLETE updated profile JSON in a \`\`\`profile block like this:
\`\`\`profile
{"interests": [...], "context": "...", "goals": [...], "tracked_entities": [...]}
\`\`\`

When no change is requested, just respond conversationally without a \`\`\`profile block.

Always preserve the full profile structure — interests must have domain and weight, goals and tracked_entities are string arrays.`;

    const response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const text = (response.content[0] as { type: string; text: string }).text;

    // Check if Claude output an updated profile
    const profileMatch = text.match(/```profile\s*([\s\S]*?)```/);
    let updatedProfile: UserProfile | null = null;

    if (profileMatch) {
      try {
        updatedProfile = JSON.parse(profileMatch[1].trim());

        // Save to Supabase
        const { data: existing } = await supabaseAdmin
          .from('user_profile')
          .select('id')
          .limit(1)
          .single();

        if (existing) {
          await supabaseAdmin
            .from('user_profile')
            .update({ ...updatedProfile, updated_at: new Date().toISOString() })
            .eq('id', existing.id);
        }
      } catch {
        updatedProfile = null;
      }
    }

    // Strip the ```profile block from the message shown to the user
    const message = text.replace(/```profile[\s\S]*?```/g, '').trim();

    return NextResponse.json({ message, updatedProfile });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
