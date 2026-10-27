import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { chatApi } from './server/devApi.ts';

export default defineConfig({
  // Relative asset paths, so the build runs from any folder or static host.
  base: './',
  // POST /api/chat for the Suhail assistant, with the key read from .env (never bundled).
  plugins: [react(), chatApi()],
  server: { port: 5173, host: true },
});
