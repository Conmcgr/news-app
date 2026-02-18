import { NextRequest } from 'next/server';
import { anthropic, MODELS } from '../../../lib/claude';
import { supabase } from '../../../lib/supabase';
import { ChatMessage } from '../../../lib/types';
import profileJson from '../../../config/profile.json';

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

  // Fetch the digest item for context
  const { data: item, error: itemError } = await supabase
    .from('digest_items')
    .select('*')
    .eq('id', digestItemId)
    .single();

  if (itemError || !item) {
    return new Response(JSON.stringify({ error: 'Digest item not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const profile = profileJson;

  const systemPrompt = `You are a tech intelligence research assistant helping a technically-minded college student who is part of a VC fund and wants to eventually found or join an early-stage startup.

User context: ${profile.context}
User goals: ${profile.goals.join('; ')}
User interests: ${profile.interests.map((i: { domain: string; weight: number }) => i.domain).join(', ')}

You're discussing a specific news item from the user's weekly tech intelligence digest. Stay focused on this item and its implications. Be concrete and actionable, not generic. Draw on your knowledge of the broader tech/VC landscape to give insightful responses.

DIGEST ITEM CONTEXT:
Headline: ${item.headline}
Summary: ${item.summary}
Why it matters: ${item.why_it_matters}
Opportunity analysis: ${item.opportunity_analysis}
Tags: ${(item.tags as string[]).join(', ')}
Sources: ${(item.sources as Array<{ url: string; title: string }>).map((s) => `${s.title} (${s.url})`).join(', ')}`;

  // Build messages array for Claude
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

  // Stream response from Claude
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

        // Save assistant response to DB (fire and forget)
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
