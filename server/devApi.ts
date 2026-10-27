import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseEnv } from 'node:util';
import type { Connect, Plugin } from 'vite';
import { handleChat, type ChatEnv } from './chat.js';

/**
 * The project's .env files, read on every request so pasting the key in needs no restart. Only these
 * files count: an ANTHROPIC_API_KEY set elsewhere on the machine is not picked up by accident. Only
 * variables named VITE_* ever reach the browser; ANTHROPIC_* stay on this side.
 */
function readEnvFiles(dir: string, mode: string): ChatEnv {
  const env: Record<string, string | undefined> = {};
  for (const name of ['.env', '.env.local', `.env.${mode}`, `.env.${mode}.local`]) {
    try {
      Object.assign(env, parseEnv(readFileSync(join(dir, name), 'utf8')));
    } catch {
      // No such file.
    }
  }
  return env;
}

/** Serves POST /api/chat from `npm run dev` and `npm run preview`, the same handler as the Vercel function. */
export function chatApi(): Plugin {
  let mode = 'development';
  let envDir = process.cwd();

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    void (async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(chunk as Buffer);
      const headers = new Headers();
      for (const name of ['content-type', 'origin']) {
        const value = req.headers[name];
        if (typeof value === 'string') headers.set(name, value);
      }
      const abort = new AbortController();
      res.on('close', () => abort.abort());
      const request = new Request(`http://${req.headers.host ?? 'localhost'}/api/chat`, {
        method: req.method,
        headers,
        body: req.method === 'POST' ? Buffer.concat(chunks) : undefined,
        signal: abort.signal,
      });
      const response = await handleChat(request, readEnvFiles(envDir, mode));
      res.statusCode = response.status;
      response.headers.forEach((value, name) => res.setHeader(name, value));
      if (!response.body) return void res.end();
      for await (const chunk of response.body) res.write(chunk);
      res.end();
    })().catch(next);
  };

  return {
    name: 'suhail-chat-api',
    configResolved(config) {
      mode = config.mode;
      envDir = typeof config.envDir === 'string' ? config.envDir : config.root;
    },
    configureServer(server) {
      server.middlewares.use('/api/chat', middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/chat', middleware);
    },
  };
}
