import { NextRequest, NextResponse } from 'next/server';
import { anthropic, MODELS } from '../../../../lib/claude';

const SYSTEM_PROMPT = `You are helping a user set up their personal tech intelligence digest. Have a warm, natural conversation to understand their background, interests, and goals — so the weekly digest can be tailored specifically to them.

Work through these topics in order, naturally (don't make it feel like a form):
1. Their background and what they're currently working on
2. Which technical domains and topics they're most excited about — push for specificity
3. Which companies, labs, funds, or people they want to track
4. What they want to get out of the digest

Keep your responses short — 2-4 sentences, one focused question at a time.

After you've covered all four topics (usually after 4-5 user messages), write a brief summary of what you've learned and confirm it with them. End the confirmation message with this exact line:
"Type 'looks good' to save, or tell me what to adjust."

When the user confirms (says something like "looks good", "that's right", "save it", "perfect", "correct", "yes", "yep"), respond with ONLY this exact token and nothing else:
PROFILE_COMPLETE`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const response = await anthropic.messages.create({
      model: MODELS.sonnet,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = (response.content[0] as { type: string; text: string }).text;
    return NextResponse.json({ message: text });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
