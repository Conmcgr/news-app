import { NextRequest } from 'next/server';
import { anthropic, MODELS } from '../../../lib/claude';
import { supabase } from '../../../lib/supabase';
import { fetchArxivFullText } from '../../../lib/arxiv';
import { ChatMessage, DigestSource, UserProfile } from '../../../lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { digestItemId, message, history = [] } = body as {
    digestItemId: string;
    message: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
  };

  if (!digestItemId || !message) {
    return new Response(JSON.stringify({ error: 'digestItemId and message are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch the digest item and user profile in parallel
  const [{ data: item, error: itemError }, { data: profileData }] = await Promise.all([
    supabase.from('digest_items').select('*').eq('id', digestItemId).single(),
    supabase.from('user_profile').select('*').single(),
  ]);

  if (itemError || !item) {
    return new Response(JSON.stringify({ error: 'Digest item not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const profile = profileData as UserProfile | null;

  // For arXiv papers, fetch the full paper text to include in context
  const sources = (item.sources as DigestSource[]) ?? [];
  const arxivSource = sources.find(
    (s) => s.type === 'paper' && s.url.includes('arxiv.org')
  );
  let fullPaperText: string | null = null;
  if (arxivSource) {
    fullPaperText = await fetchArxivFullText(arxivSource.url);
  }

  const profileSection = profile
    ? `User context: ${profile.context}
User goals: ${profile.goals?.join('; ')}
User interests: ${profile.interests?.map((i) => i.domain).join(', ')}`
    : '';

  const paperSection = fullPaperText
    ? `\n\nFULL PAPER TEXT (you have access to the complete paper — answer confidently and specifically):\n${fullPaperText}`
    : '';

  const systemPrompt = `You are a tech intelligence research assistant helping a technically-minded college student who is part of a VC fund and wants to eventually found or join an early-stage startup.

${profileSection}

You're discussing a specific item from the user's weekly tech intelligence digest. Stay focused on this item and its implications. Be concrete and actionable, not generic. Draw on your knowledge of the broader tech/VC landscape to give insightful responses. Use markdown formatting in your responses (headers, bullet points, bold text, code blocks where relevant).

DIGEST ITEM CONTEXT:
Headline: ${item.headline}
Summary: ${item.summary}
Why it matters: ${item.why_it_matters}
Opportunity analysis: ${item.opportunity_analysis}
Tags: ${(item.tags as string[]).join(', ')}
Sources: ${sources.map((s) => `${s.title} (${s.url})`).join(', ')}${paperSection}`;

  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ];

  // Save user message to DB (fire and forget)
  supabase
    .from('chat_messages')
    .insert({
      digest_item_id: digestItemId,
      role: 'user',
      content: message,
    } as ChatMessage)
    .then(({ error }) => {
      if (error) console.error('Failed to save user message:', error);
    });

  const stream = anthropic.messages.stream({
    model: MODELS.sonnet,
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const encoder = new TextEncoder();
  let fullResponse = '';

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(text));
          }
        }
      } finally {
        controller.close();

        if (fullResponse) {
          supabase
            .from('chat_messages')
            .insert({
              digest_item_id: digestItemId,
              role: 'assistant',
              content: fullResponse,
            } as ChatMessage)
            .then(({ error }) => {
              if (error) console.error('Failed to save assistant message:', error);
            });
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
