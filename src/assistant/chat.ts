import { create } from 'zustand';
import { useStore } from '../store';
import type { ChatRequest, ChatTurn } from './knowledge';

/** Where the app asks Suhail. A static build (GitHub Pages) can point this at the Vercel function. */
const ENDPOINT: string = import.meta.env.VITE_CHAT_API_URL || '/api/chat';

/** A line Suhail shows in place of a reply: not connected, no signal, too busy, or declined. */
export type Notice = 'offline' | 'failed' | 'busy' | 'refusal';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  notice?: Notice;
  streaming?: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  /** Waiting for the first word of a reply: shows the typing dots. */
  waiting: boolean;
  /** A reply is on its way: sending is paused. */
  busy: boolean;
  send: (text: string) => void;
  retry: () => void;
  reset: () => void;
}

let nextId = 1;
let inflight: AbortController | null = null;

/** The conversation lives for the session; closing the sheet keeps it. */
export const useChat = create<ChatState>()((set, get) => {
  const patch = (id: number, p: Partial<ChatMessage>) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, ...p } : m)) }));

  const stream = async (replyId: number, request: ChatRequest, signal: AbortSignal) => {
    let text = '';
    const finish = (notice?: Notice) => {
      patch(replyId, notice ? { notice, text: '', streaming: false } : { streaming: false });
      set({ waiting: false, busy: false });
    };
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal,
      });
    } catch {
      if (!signal.aborted) finish('failed');
      return;
    }
    // No endpoint at all (a static host without the function) reads as "not connected yet".
    if (!res.ok || !res.body || !(res.headers.get('content-type') ?? '').includes('ndjson')) {
      finish(res.status === 429 ? 'busy' : res.ok || res.status === 404 || res.status === 405 ? 'offline' : 'failed');
      return;
    }
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buffer = '';
    let ended: Notice | 'done' | null = null;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          const e = JSON.parse(line) as { type: string; text?: string; code?: string };
          if (e.type === 'text' && e.text) {
            text += e.text;
            patch(replyId, { text });
            if (get().waiting) set({ waiting: false });
          } else if (e.type === 'done') ended = 'done';
          else if (e.type === 'refusal') ended = 'refusal';
          else if (e.type === 'error') ended = e.code === 'not_configured' ? 'offline' : e.code === 'busy' ? 'busy' : 'failed';
        }
      }
    } catch {
      if (signal.aborted) return;
      if (!ended) ended = text ? 'done' : 'failed';
    }
    // A declined or failed reply drops any partial text; a reply cut short keeps what arrived.
    if (ended && ended !== 'done') finish(ended);
    else finish(text ? undefined : 'failed');
  };

  return {
    messages: [],
    waiting: false,
    busy: false,

    send: (raw) => {
      const text = raw.trim();
      if (!text || get().busy) return;
      const reply: ChatMessage = { id: nextId++, role: 'assistant', text: '', streaming: true };
      set((s) => ({ messages: [...s.messages, { id: nextId++, role: 'user', text }, reply], waiting: true, busy: true }));
      const history: ChatTurn[] = get()
        .messages.filter((m) => !m.notice && !m.streaming && m.text)
        .map((m) => ({ role: m.role, content: m.text }));
      const app = useStore.getState();
      const inDowntown = app.view === 'downtown' || app.view === 'flyingIn';
      inflight = new AbortController();
      void stream(
        reply.id,
        { lang: app.lang, downtownId: inDowntown ? app.downtownId : null, visited: Object.keys(app.visited), messages: history },
        inflight.signal,
      );
    },

    retry: () => {
      const { messages, busy } = get();
      if (busy) return;
      const last = messages.map((m) => m.role).lastIndexOf('user');
      if (last < 0) return;
      const text = messages[last].text;
      set({ messages: messages.slice(0, last) });
      get().send(text);
    },

    reset: () => {
      inflight?.abort();
      inflight = null;
      set({ messages: [], waiting: false, busy: false });
    },
  };
});
