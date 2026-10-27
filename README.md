# Suhail (سُهَيْل)

Explore your hotel's neighbourhood in Riyadh like a game map.

Suhail is a tourism app prototype built for a Saudi tourism hackathon. Each hotel becomes the centre of its own themed "downtown", shown as a game-style island map. Its nearby places sit on islands around the hotel, and each stop turns green once you check in.

## Features

- **Three downtowns, one per hotel**
  - **The Old Capital**: Ramada by Wyndham Riyadh, King Fahd Road
  - **The Heritage Village**: Bab Samhan, a Luxury Collection Hotel, Diriyah
  - **The Skyline District**: Comfort Hotel Riyadh Olaya
- **Game-map downtowns.** A 3D city overview flies into each downtown. Places are linked by a dotted route, nearby metro stations are marked, and a progress bar tracks your visits. Checking in to a place turns it green, with a checkmark.
- **Bonus zone.** In The Heritage Village, JAX District unlocks once every heritage place on the main route is checked in.
- **Book a guide (Rafeeq).** Book a local tour guide by the hour. Filter by downtown and language, pick a duration and confirm.
- **Suhail AI assistant.** The gold star button beside "Book a guide" opens a chat. It answers questions about the downtowns, their places, opening hours, metro access and guides. Replies stream in, with suggestions that fit the screen you're on.
- **Three languages.** English, Arabic (full right-to-left layout, including the map) and Chinese (Simplified). Switch anytime from the language bar at the top.

## Tech stack

| Area | Packages |
|---|---|
| UI | React 19, TypeScript |
| Build and dev server | Vite 8, @vitejs/plugin-react |
| 3D scene | three, @react-three/fiber, @react-three/drei |
| Animation | framer-motion |
| State | zustand (progress and bookings are saved in the browser) |
| Languages | i18next, react-i18next |
| Icons | lucide-react |
| AI assistant | @anthropic-ai/sdk (Anthropic Messages API, streaming) |

## Getting started

### Requirements

- Node.js and npm. `package.json` does not pin a Node version. The project was built with Node 24; Vite 8 needs Node 20.19 or newer.
- An Anthropic API key, only if you want the assistant to reply.

### Steps

```bash
git clone https://github.com/NataliShaat/suhail.git
cd suhail
npm install
cp .env.example .env      # on Windows PowerShell: Copy-Item .env.example .env
```

Open `.env` and paste your key after `ANTHROPIC_API_KEY=`. Then start the app:

```bash
npm run dev
```

Open http://localhost:5173. On a laptop the app sits in a phone-sized frame; on a phone it fills the screen.

### Environment variables

| Variable | Required | What it does |
|---|---|---|
| `ANTHROPIC_API_KEY` | For the assistant | Your Anthropic API key. |
| `ANTHROPIC_MODEL` | No | The model the assistant uses. Defaults to `claude-sonnet-5-5`. |
| `CHAT_ALLOWED_ORIGINS` | No | Other sites allowed to call `/api/chat` (comma-separated, `*.` wildcards). Defaults to any `https://*.github.io` site and localhost. |
| `VITE_CHAT_API_URL` | No | Set at build time when the app is hosted separately from the API, for example `https://your-project.vercel.app/api/chat`. Defaults to `/api/chat`. |

The API key stays on the server. The browser never receives it: it's read by the dev server middleware (`server/devApi.ts`) or by the Vercel function (`api/chat.ts`). `.env` is listed in `.gitignore`. Never commit it, and never put the key in frontend code.

The dev server reads `.env` on every chat message, so you don't need to restart after adding the key.

### Without a key

The app runs fully without a key. The map, check-ins, guide booking and languages all work. Only the assistant is affected: it shows a "Suhail isn't connected yet" message and offers to book a guide instead.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Starts the Vite dev server on port 5173, with the `/api/chat` endpoint. |
| `npm run build` | Type-checks the app and the server code, then builds the production site into `dist/`. |
| `npm run preview` | Serves the production build locally, with the `/api/chat` endpoint. |
| `npm run typecheck` | Type-checks the app and the server code without building. |

## Project structure

```
api/
  chat.ts              Vercel serverless function for POST /api/chat
server/
  chat.ts              Chat handler shared by Vercel and the dev server (CORS, streaming)
  devApi.ts            Vite plugin: serves /api/chat locally and reads .env
public/                Logo, web app manifest
src/
  App.tsx              Root layout: 3D scene plus screens
  config.ts            App name, colours, district themes, animation settings
  store.ts             App state: view, language, check-ins, bookings
  assistant/           Suhail's knowledge (system prompt) and chat client
  data/                Downtowns, places, guides, opening hours, map layout
  i18n/                English, Arabic and Chinese text
  screens/             City overview, downtown map, place sheet, Rafeeq, booking, settings, chat
  three/               3D scene: islands, hotels, camera framing
  ui/                  Shared components: sheet, language bar, icons, phone frame
index.html
vite.config.ts
vercel.json            Function settings for api/chat.ts
.env.example           Template for .env
```

## Deployment

The project is set up for Vercel. `vercel.json` configures the `api/chat.ts` function, with a 60-second limit for streamed replies.

1. Import the GitHub repository in Vercel. It detects Vite, builds with `npm run build` and serves `dist/`.
2. In Project → Settings → Environment Variables, add `ANTHROPIC_API_KEY`. Optionally add `ANTHROPIC_MODEL` and `CHAT_ALLOWED_ORIGINS`.
3. Redeploy so the new variables take effect.

### Static hosting (for example, GitHub Pages)

The build uses relative paths, so `dist/` runs from any static host. A static host can't run the chat endpoint, so deploy the API to Vercel and point the build at it:

```bash
VITE_CHAT_API_URL=https://your-project.vercel.app/api/chat npm run build
```

On Vercel, set `CHAT_ALLOWED_ORIGINS` to your own site (for example `https://your-name.github.io`) so other sites can't use the endpoint. It's also worth setting a spend limit in the Anthropic Console.

## Notes

- **Sample data.** Some place descriptions, highlights and all opening hours are sample prototype data. Each place lists its sample fields under `"prototype"` in `src/data/downtowns.json`.
- **Fictional guides.** Guide names, ratings, hourly rates and availability in `src/data/guides.json` are made up.
- **No real bookings.** Bookings are saved only in the browser, and booking references are random. Nothing is sent anywhere.

## Team

| Name | Role |
|---|---|
| [Name] | [Role] |
| [Name] | [Role] |
| [Name] | [Role] |
