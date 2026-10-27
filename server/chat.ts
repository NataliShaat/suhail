/**
 * POST /api/chat: Suhail's replies, streamed from the Anthropic Messages API. One Web-standard handler
 * (Request in, Response out) serves both the Vite dev server (server/devApi.ts) and the Vercel
 * function (api/chat.ts). The API key stays here, on the server; the app never sees it.
 *
 * The response is newline-delimited JSON, one event per line:
 *   {"type":"text","text":"…"}  a piece of the reply
 *   {"type":"done"}             finished
 *   {"type":"refusal"}          the model declined; the app shows its own line instead
 *   {"type":"error","code":"not_configured"|"busy"|"failed"}
 */
import Anthropic from '@anthropic-ai/sdk';
import { KNOWLEDGE, contextFor, parseChatRequest } from '../src/assistant/knowledge.js';

export interface ChatEnv {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  /** Comma-separated origins allowed to call from another site, e.g. "https://name.github.io". `*.` wildcards work. */
  CHAT_ALLOWED_ORIGINS?: string;
}

const DEFAULT_MODEL = 'claude-sonnet-5-5';
// Models that accept the server-side `fallbacks: "default"` retry when a safety classifier declines.
const FALLBACK_MODELS = new Set(['claude-fable-5-1', 'claude-opus-5-5', 'claude-opus-5', 'claude-sonnet-5-5']);
// Without CHAT_ALLOWED_ORIGINS: any GitHub Pages site and local dev servers.
const DEFAULT_ORIGINS = ['https://*.github.io', 'http://localhost:*', 'http://127.0.0.1:*'];

function originPattern(p: string) {
  const re = p.replace(/[.+?^${}()|[\]\\/]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`^${re}$`, 'i');
}

/** The origin to echo back for CORS, or null. Same-site calls (the app on Vercel) need no CORS. */
function allowedOrigin(request: Request, env: ChatEnv): string | null {
  const origin = request.headers.get('origin');
  if (!origin) return null;
  if (origin === new URL(request.url).origin) return origin;
  const list = env.CHAT_ALLOWED_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean);
  return (list?.length ? list : DEFAULT_ORIGINS).some((p) => originPattern(p).test(origin)) ? origin : null;
}

function headers(origin: string | null, type?: string) {
  const h = new Headers({ 'Cache-Control': 'no-store', Vary: 'Origin' });
  if (type) h.set('Content-Type', type);
  if (origin) {
    h.set('Access-Control-Allow-Origin', origin);
    h.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    h.set('Access-Control-Allow-Headers', 'Content-Type');
    h.set('Access-Control-Max-Age', '86400');
  }
  return h;
}

const json = (body: object, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), { status, headers: headers(origin, 'application/json') });

function errorCode(err: unknown): 'not_configured' | 'busy' | 'failed' {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) return 'not_configured';
  if (err instanceof Anthropic.RateLimitError) return 'busy';
  if (err instanceof Anthropic.APIError && err.status === 529) return 'busy';
  return 'failed';
}

export async function handleChat(request: Request, env: ChatEnv): Promise<Response> {
  const origin = allowedOrigin(request, env);
  if (request.headers.get('origin') && !origin) return json({ error: 'origin_not_allowed' }, 403, null);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, origin);

  const encoder = new TextEncoder();
  const line = (event: object) => encoder.encode(JSON.stringify(event) + '\n');
  const ndjson = headers(origin, 'application/x-ndjson; charset=utf-8');
  ndjson.set('X-Accel-Buffering', 'no');

  // A missing key is an expected state while setting up: answer quietly (200), with no log line.
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return new Response(line({ type: 'error', code: 'not_configured' }), { status: 200, headers: ndjson });

  let chat;
  try {
    chat = parseChatRequest(await request.json());
  } catch {
    chat = null;
  }
  if (!chat) return json({ error: 'bad_request' }, 400, origin);

  const model = env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });
  const abort = new AbortController();
  request.signal?.addEventListener('abort', () => abort.abort());

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = client.beta.messages.stream(
          {
            model,
            max_tokens: 4096,
            // A chat on a phone: quick, short answers.
            output_config: { effort: 'low' },
            system: [
              // The app's data never changes between requests, so it is cached; the context after it does.
              { type: 'text', text: KNOWLEDGE, cache_control: { type: 'ephemeral' } },
              { type: 'text', text: contextFor(chat) },
            ],
            messages: chat.messages,
            ...(FALLBACK_MODELS.has(model) ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
          },
          { signal: abort.signal },
        );
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(line({ type: 'text', text: event.delta.text }));
          }
        }
        const final = await stream.finalMessage();
        controller.enqueue(line({ type: final.stop_reason === 'refusal' ? 'refusal' : 'done' }));
      } catch (err) {
        if (!abort.signal.aborted) {
          const code = errorCode(err);
          if (code !== 'not_configured') console.error('[suhail] chat failed:', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err);
          controller.enqueue(line({ type: 'error', code }));
        }
      } finally {
        try {
          controller.close();
        } catch {
          // Already closed by the reader.
        }
      }
    },
    cancel() {
      abort.abort();
    },
  });
  return new Response(body, { status: 200, headers: ndjson });
}
