'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, CheckCircle } from 'lucide-react';
import { UserProfile } from '../../lib/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const OPENING_MESSAGE =
  "Here's what I have on you. Tell me what you'd like to change — for example, \"remove Defense Tech\", \"add Sequoia to tracked entities\", or \"update my background to...\".";

export function EditProfile({ initialProfile }: { initialProfile: UserProfile }) {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: OPENING_MESSAGE },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/onboard/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, currentProfile: profile }),
      });
      const data = await res.json();

      if (data.updatedProfile) {
        setProfile(data.updatedProfile);
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }

      setMessages([...newMessages, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages([
        ...newMessages,
        { role: 'assistant', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
        {/* Profile display */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
          {/* Background */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Background</h3>
            <p className="text-sm text-zinc-300 leading-relaxed">{profile.context}</p>
          </div>

          {/* Interests */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Interests</h3>
            <div className="space-y-2">
              {profile.interests
                .sort((a, b) => b.weight - a.weight)
                .map((interest) => (
                  <div key={interest.domain} className="flex items-center gap-3">
                    <span className="text-sm text-zinc-300 w-48 truncate">{interest.domain}</span>
                    <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${interest.weight * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-zinc-500 w-8 text-right">{interest.weight.toFixed(1)}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Goals */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Goals</h3>
            <ul className="space-y-1.5">
              {profile.goals.map((goal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <span className="text-zinc-600 mt-0.5">•</span>
                  {goal}
                </li>
              ))}
            </ul>
          </div>

          {/* Tracked entities */}
          <div className="px-5 py-4">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Tracking</h3>
            <div className="flex flex-wrap gap-2">
              {profile.tracked_entities.map((entity) => (
                <span
                  key={entity}
                  className="text-xs text-zinc-400 bg-zinc-800 border border-zinc-700 px-2.5 py-1 rounded-full"
                >
                  {entity}
                </span>
              ))}
            </div>
          </div>

          {/* Saved indicator */}
          {lastSaved && (
            <div className="px-5 py-3 flex items-center gap-1.5 text-xs text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              Saved at {lastSaved}
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={
                  msg.role === 'user'
                    ? 'max-w-lg bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed'
                    : 'max-w-lg bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed'
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-tl-sm px-4 py-3">
                <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      <div className="sticky bottom-0 bg-zinc-950/90 backdrop-blur-sm border-t border-zinc-800">
        <div className="max-w-2xl mx-auto px-6 py-4">
          <div className="flex items-end gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
              rows={1}
              placeholder='e.g. "add Sequoia to tracked entities" or "remove Defense Tech"'
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500 transition-colors disabled:opacity-50"
              style={{ minHeight: '44px', maxHeight: '120px' }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = `${Math.min(t.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
          <p className="text-xs text-zinc-600 mt-2 text-center">
            Changes save automatically · Enter to send
          </p>
        </div>
      </div>
    </>
  );
}
