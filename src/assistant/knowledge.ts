/**
 * What Suhail knows, built from the app's own data: every downtown, place, metro station and guide,
 * with their names in all three languages. Runs on the server only (Vite dev middleware and the
 * Vercel function), so it imports with explicit extensions and JSON import attributes, which plain
 * Node ESM needs. The browser only imports its types.
 */
import type { Downtown, Guide, Place } from '../data/types.js';
import { describeHours, openWindow, riyadhClock, windowOn, WEEKDAYS } from '../data/hours.js';
import rawDowntowns from '../data/downtowns.json' with { type: 'json' };
import rawGuides from '../data/guides.json' with { type: 'json' };
import en from '../i18n/en.json' with { type: 'json' };
import ar from '../i18n/ar.json' with { type: 'json' };
import zh from '../i18n/zh-CN.json' with { type: 'json' };

export type ChatLang = 'en' | 'ar' | 'zh-CN';

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

/** What the app sends with every message. */
export interface ChatRequest {
  lang: ChatLang;
  /** The downtown on screen, or null on the downtown picker. */
  downtownId: string | null;
  /** Ids of the places the user has checked in at. */
  visited: string[];
  messages: ChatTurn[];
}

interface Strings {
  app: { name: string };
  downtowns: Record<string, { name: string; hotel: string; hotelShort: string; vibe: string }>;
  places: Record<string, { name: string; desc?: string }>;
  categories: Record<string, string>;
  specialties: Record<string, string>;
  guides: Record<string, string>;
}

const STRINGS = { en, ar, 'zh-CN': zh } as unknown as Record<ChatLang, Strings>;
const DOWNTOWNS = rawDowntowns.downtowns as unknown as Downtown[];
const GUIDES = rawGuides.guides as Guide[];
const LANG_NAME: Record<ChatLang, string> = { en: 'English', ar: 'Arabic', 'zh-CN': 'Simplified Chinese' };
const THEME_NAME: Record<string, string> = {
  oldcity: 'old city',
  heritage: 'heritage village',
  modern: 'modern skyline',
  nightlife: 'nightlife and art',
};

const MAX_TURNS = 16;
const MAX_CHARS = 2000;

const placesOf = (d: Downtown): Place[] => (d.bonus ? [...d.places, ...d.bonus.places] : d.places);
const ALL_PLACE_IDS = new Set(DOWNTOWNS.flatMap((d) => placesOf(d).map((p) => p.id)));

/** "Name (Arabic: …; Chinese: …)", so the reply can use the app's own name in any language. */
function names(id: string, kind: 'places' | 'downtowns') {
  const n = (l: ChatLang) => STRINGS[l][kind][id]?.name ?? id;
  return `${n('en')} (Arabic: ${n('ar')}; Chinese: ${n('zh-CN')})`;
}

const enName = (id: string) => STRINGS.en.places[id]?.name ?? STRINGS.en.downtowns[id]?.name ?? id;

function metres(lat: number, lng: number, lat0: number, lng0: number) {
  const east = (lng - lng0) * Math.cos((lat0 * Math.PI) / 180) * 111320;
  const north = (lat - lat0) * 110574;
  return Math.hypot(east, north);
}

function distance(m: number) {
  const far = m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
  return m < 2500 ? `${far} (${Math.max(1, Math.round(m / 80))} min walk)` : `${far} (by car or metro)`;
}

function placeLine(p: Place, d: Downtown, route: string[]) {
  const s = STRINGS.en.places[p.id];
  const facts = [
    STRINGS.en.categories[p.category] + (p.alsoCoffee ? ' and coffee' : ''),
    `${distance(metres(p.lat, p.lng, d.hotel.lat, d.hotel.lng))} from the hotel`,
    `hours ${describeHours(p.hours)}${p.prototype?.includes('hours') ? ' (sample)' : ''}`,
  ];
  if (p.free) facts.push('free entry');
  if (p.evening) facts.push('best in the evening');
  if (p.final) facts.push('final stop of the route');
  const step = route.indexOf(p.id);
  if (step >= 0) facts.push(`stop ${step + 1} of ${route.length} on the suggested route`);
  return [
    `- ${names(p.id, 'places')} [id ${p.id}]: ${facts.join('; ')}.`,
    s?.desc ? `  About: ${s.desc}` : '',
    p.highlights.length ? `  Highlights: ${p.highlights.join('; ')}.` : '',
  ].filter(Boolean).join('\n');
}

function downtownSection(d: Downtown) {
  const s = STRINGS.en.downtowns[d.id];
  const metro = d.metro.length
    ? `Metro: Blue Line. ${d.metro.map((m) => `${names(m.id, 'places')} station, ${distance(metres(m.lat, m.lng, d.hotel.lat, d.hotel.lng))} from the hotel`).join('. ')}.`
    : 'Metro: none yet; a Red Line extension to Diriyah is planned. Get around on foot, by car, or with a Rafeeq guide.';
  const lines = [
    `## ${names(d.id, 'downtowns')} [id ${d.id}]`,
    `Hotel: ${s.hotel}.`,
    `Theme: ${THEME_NAME[d.theme] ?? d.theme}. Vibe: ${s.vibe}`,
    metro,
    `Suggested route: ${d.route.map(enName).join(' → ')}.`,
    `Places (${d.places.length} count towards progress):`,
    ...d.places.map((p) => placeLine(p, d, d.route)),
  ];
  if (d.bonus) {
    const z = STRINGS.en.places[d.bonus.id];
    lines.push(
      `Bonus zone: ${names(d.bonus.id, 'places')}. ${z?.desc ?? ''} It unlocks once every ${d.bonus.unlockAfterCategory} place on the main route is checked in; until then a Rafeeq guide can take the user. It is 3.5 km west of the hotel, by car or with a Rafeeq.`,
      ...d.bonus.places.map((p) => placeLine(p, d, d.bonus!.route)),
    );
  }
  return lines.join('\n');
}

function guideLine(g: Guide) {
  const a = g.availability;
  const when = a.kind === 'now' ? 'available today' : a.kind === 'tomorrow' ? 'available tomorrow' : `available from ${String(a.hour).padStart(2, '0')}:00`;
  return `- ${STRINGS.en.guides[g.id]} (Arabic: ${STRINGS.ar.guides[g.id]}; Chinese: ${STRINGS['zh-CN'].guides[g.id]}): speaks ${g.languages.map((l) => LANG_NAME[l]).join(', ')}; ${g.specialties.join(', ')}; rated ${g.rating}/5; ${g.rate} SAR per hour; covers ${g.downtowns.map(enName).join(' and ')}; ${when}.`;
}

/** The fixed part of the system prompt. It never changes between requests, so it is cached. */
export const KNOWLEDGE = [
  `You are Suhail (Arabic: ${STRINGS.ar.app.name}; Chinese: ${STRINGS['zh-CN'].app.name}), the assistant inside the Suhail travel app for Riyadh. Suhail is the Arabic name of Canopus, the bright southern star that guided desert travellers; you are that star, now guiding visitors.`,
  '',
  'How you talk',
  '- A warm, concise local guide. Answers fit a phone screen: usually one to three short sentences, or up to four short lines that start with "• ". No headings, tables, links or emojis. Use **bold** only for place names, and sparingly.',
  "- Reply in the language of the user's latest message. If that is unclear (a name, a single word, an emoji), reply in the app language given under \"Right now\".",
  '- Name places exactly as listed below, in the reply language (Arabic and Chinese names are given in brackets).',
  '',
  'What you know',
  '- Recommend only the downtowns, places, metro stations and guides listed below. If asked about anything else, say it is not in the app yet and offer the closest listed option. Never invent places, prices, phone numbers or events.',
  '- Opening hours marked (sample) are prototype values. Give them plainly; for something time-critical you may add a short "worth checking before you go".',
  '- Use "Right now" for the time in Riyadh, what is open, where the user is and where they have already been. Do not suggest a place they have checked in at as new unless they ask.',
  '',
  'The app',
  '- Three hotels, each the heart of its own downtown. On the downtown picker the user chooses the hotel they stay at; inside a downtown they check in at places to fill a progress bar.',
  '- Rafeeq books a licensed local guide by the hour (the "Book a guide" button). Suggest it when it really helps: the bonus zone is still locked, a downtown has no metro, the user wants deeper history or architecture, has little time, or wants a guide who speaks their language. Mention it at most once per answer, and not in every answer.',
  '- On the picker, if asked which downtown suits them, compare the three vibes in one short line each, then recommend one or ask one question about what they enjoy.',
  '',
  '# Downtowns',
  ...DOWNTOWNS.map(downtownSection),
  '',
  '# Guides (Rafeeq)',
  ...GUIDES.map(guideLine),
].join('\n');

function hhmm(minute: number) {
  return `${String(Math.floor(minute / 60) % 24).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
}

function openNowLines(d: Downtown, day: number, minute: number) {
  const open: string[] = [];
  const closed: string[] = [];
  for (const p of placesOf(d)) {
    const now = openWindow(p.hours, day, minute);
    const today = windowOn(p.hours, day);
    if (now) {
      open.push(`${enName(p.id)} (until ${now[1]})`);
    } else {
      const later = today && today[0] > hhmm(minute) ? `opens ${today[0]}` : 'closed for the rest of today';
      closed.push(`${enName(p.id)} (${later})`);
    }
  }
  return `- ${enName(d.id)}: open now: ${open.join(', ') || 'nothing'}. Closed now: ${closed.join(', ') || 'nothing'}.`;
}

/** The part of the system prompt that changes with every request. */
export function contextFor(req: ChatRequest, now = new Date()) {
  const { day, minute } = riyadhClock(now);
  const d = DOWNTOWNS.find((x) => x.id === req.downtownId);
  const visited = req.visited.map((id) => {
    const home = DOWNTOWNS.find((x) => placesOf(x).some((p) => p.id === id));
    return home ? `${enName(id)} (${enName(home.id)})` : enName(id);
  });
  const lines = [
    '# Right now',
    `- App language: ${LANG_NAME[req.lang]} (${req.lang}).`,
    `- Time in Riyadh: ${WEEKDAYS[day]} ${hhmm(minute)}.`,
    d
      ? `- Screen: inside ${enName(d.id)}, the downtown around ${STRINGS.en.downtowns[d.id].hotel}. "Here", "this place" or "the museum" refer to this downtown first.`
      : '- Screen: the downtown picker. The user has not chosen a downtown yet.',
    `- Checked in so far: ${visited.join(', ') || 'nowhere yet'}.`,
  ];
  if (d?.bonus) {
    const unlocked = d.places.filter((p) => p.category === d.bonus!.unlockAfterCategory).every((p) => req.visited.includes(p.id));
    lines.push(`- Bonus zone ${enName(d.bonus.id)}: ${unlocked ? 'unlocked' : 'still locked'}.`);
  }
  lines.push(...(d ? [openNowLines(d, day, minute)] : DOWNTOWNS.map((x) => openNowLines(x, day, minute))));
  return lines.join('\n');
}

/** Checks and trims what the app sent. Returns null when it isn't a chat request. */
export function parseChatRequest(body: unknown): ChatRequest | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const lang: ChatLang = b.lang === 'ar' || b.lang === 'zh-CN' ? b.lang : 'en';
  const downtownId = typeof b.downtownId === 'string' && DOWNTOWNS.some((d) => d.id === b.downtownId) ? b.downtownId : null;
  const visited = Array.isArray(b.visited) ? [...new Set(b.visited.filter((id): id is string => typeof id === 'string' && ALL_PLACE_IDS.has(id)))] : [];
  if (!Array.isArray(b.messages)) return null;
  const messages: ChatTurn[] = b.messages
    .filter((m): m is ChatTurn => !!m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim() !== '')
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role, content: m.content.trim().slice(0, MAX_CHARS) }));
  // The conversation must open with the user and end on their question.
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages[messages.length - 1].role !== 'user') return null;
  return { lang, downtownId, visited, messages };
}
