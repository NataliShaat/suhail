// Vercel function: POST /api/chat. Set ANTHROPIC_API_KEY (and optionally ANTHROPIC_MODEL and
// CHAT_ALLOWED_ORIGINS) under Project → Settings → Environment Variables, then redeploy.
import { handleChat } from '../server/chat.js';

export function POST(request: Request) {
  return handleChat(request, process.env);
}

// CORS preflight, for the app hosted elsewhere (GitHub Pages) calling this endpoint.
export function OPTIONS(request: Request) {
  return handleChat(request, process.env);
}
