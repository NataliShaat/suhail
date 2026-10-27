# Suhail (سُهَيْل · 苏海尔) — Riyadh hotel downtowns (hackathon prototype)

Every hotel becomes the heart of its own downtown, explored like a game map. Rafeeq books a licensed local guide by the hour, and Suhail, the star assistant (Suhail is the Arabic name of Canopus, the star that guided desert travellers), answers questions about the downtowns. Arabic, English and Chinese (Simplified), all local data. The only key is the Anthropic one, and it stays on the server.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/ (relative paths, any static host)
npm run preview
```

On a laptop the app sits in a phone frame (390×844, scaled to fit). On a phone it fills the screen.

## Suhail, the star assistant

The star button beside **Book a guide** opens a chat. Replies stream from the Anthropic Messages API through a server endpoint, `POST /api/chat`, which holds the key. The app never sees it.

| Where | How the key is read |
|---|---|
| `npm run dev` / `npm run preview` | Vite middleware (`server/devApi.ts`) reads `ANTHROPIC_API_KEY` from the project's `.env` on every request (no restart needed). Keys set elsewhere on the machine are ignored. |
| Vercel | `api/chat.ts` reads `process.env.ANTHROPIC_API_KEY`. Add it under Project → Settings → Environment Variables, then redeploy. |

1. `cp .env.example .env` and paste the key after `ANTHROPIC_API_KEY=`. `ANTHROPIC_MODEL` defaults to `claude-sonnet-5-5`.
2. Without a key the chat says "Suhail isn't connected yet" and offers a guide instead.
3. **Static hosting (GitHub Pages):** build with `VITE_CHAT_API_URL=https://<project>.vercel.app/api/chat npm run build`. The function allows any `https://*.github.io` origin by default; set `CHAT_ALLOWED_ORIGINS` (comma-separated, `*.` wildcards) on Vercel to narrow it.

The system prompt is built from the app's data (`src/assistant/knowledge.ts`): every downtown, place, metro station and guide, with names in all three languages, plus each request's context (language, current downtown or picker, places checked in, Riyadh time and what is open now). Handler: `server/chat.ts`. Chat UI: `src/screens/SuhailChat.tsx`. Deep link: `?suhail=1`.

## Demo flow (under two minutes)

1. The app opens in English. The language bar at the top of every screen (English | العربية | 中文) switches instantly, keeps progress, and mirrors the whole layout in Arabic.
2. Tap a hotel (the island or its label). The camera leans in, the sheet opens.
3. **I'm staying here**: the camera glides in and turns to face the hotel. Its island grows to span the screen and rests just above **Book a guide**, while the places rise behind it and the route draws itself.
4. Tap two or three places and press **Check in**: green check, solid route, progress bar, and the gold marker hops to the place.
5. **Book a guide** (on the city screen too): filter by downtown and by **中文**, pick a guide, choose **3 h**, **Confirm booking**.

### Rehearsal shortcuts (deep links)

| Link | Opens |
|---|---|
| `?fresh=1` | English, progress cleared |
| `?lang=zh-CN` | Chinese |
| `?dt=ramada` | Straight into a downtown (`ramada`, `bab-samhan`, `comfort-olaya`) |
| `?dt=ramada&visited=illume,marthad` | With those places already checked in |
| `?dt=ramada&rafeeq=1&guide=lin` | Rafeeq with a booking sheet open |
| `?visited=` | Clears check-ins |
| `?dt=ramada&suhail=1` | The Suhail chat, inside a downtown |

Settings also has **Reset all check-ins and bookings**.

## Where things live

| Change | File |
|---|---|
| App name | `app.name` in each `src/i18n/*.json`; Latin fallback `APP_NAME` in `src/config.ts`; `index.html`, `public/manifest.webmanifest` |
| Colours, fly-in duration, RTL map mirroring | `src/config.ts` |
| Hotels, places, routes, metro, opening hours, highlights | `src/data/downtowns.json` |
| Guides | `src/data/guides.json` |
| Every string, including place names | `src/i18n/en.json`, `ar.json`, `zh-CN.json` |
| Map projection (lat/lng → order around the hotel) | `src/data/geo.ts` |
| Downtown framing (camera tilt, hotel size, island placement, label spacing) | `src/three/frameDowntown.ts` |
| Suhail assistant (prompt, endpoint, chat) | `src/assistant/`, `server/`, `api/chat.ts`, `src/screens/SuhailChat.tsx` |
| 3D scene, hotels, islands | `src/three/` |
| Screens | `src/screens/` |

### Swapping a hotel for a GLB model

Drop the file in `public/models/` and set the hotel's `model` in `downtowns.json`, for example `"model": "./models/ramada.glb"`. It is scaled to the procedural building's height and placed on the island. If it fails to load, the procedural hotel stays. No scene code changes.

## Decisions to review

- **Downtown framing.** The camera looks down at about 50°. The hotel faces the viewer; its island spans about 80% of the screen width and rests 16px above **Book a guide**. Each place's box covers its badge and the island under it, islands keep open ground between them, and when they can't all fit the camera steps back a little at a time until they do. Framings are cached per screen size and language, and composed in the background while a hotel's sheet is open. Places keep their real order around the hotel (turned so the emptiest direction faces the viewer) and their near-to-far order, then are placed on screen in the space above the hotel: no label touches an edge, overlaps another label or sits on the hotel building, and every island stands behind the hotel. Their 3D positions are worked back from the screen, so the map is stylised, not to scale.
- **No metro in Diriyah**: a "No metro yet / Ride with a Rafeeq" chip stands where a station would, and opens the guide list.
- **Guides by downtown**: each guide covers one or two downtowns (`downtowns` in `guides.json`). Opened from the city, the list shows every guide with a downtown filter; inside a downtown it starts on that downtown's guides.
- **JAX District** is drawn among the Bab Samhan places; the copy states its real distance ("3.5 km west"). It unlocks when every heritage place on the main route is checked in. Before that, its places show a lock and offer "Go with a Rafeeq".
- **Arabic mirrors the map** left to right, as the brief asks for the path direction. Set `MIRROR_MAP_IN_RTL = false` to keep east on the right in every language.
- **Metro stations** are not counted in "x of 8 places". They open an info sheet with the line and distance.
- **Numbers in Arabic** use Latin digits and the Gregorian calendar (`ar-SA-u-nu-latn-ca-gregory`), matching "120 ريال".
- **Fonts** load per language: Montserrat always, IBM Plex Sans Arabic and Noto Sans SC only when that script is on screen.

## Placeholders and sample data to replace

- **Opening hours and highlights are sample values** (each place lists them in `"prototype"` in `downtowns.json`; see the `_comment` at the top).
- **Guides are fictional**: names, ratings, hourly rates (110–220 SAR) and availability in `guides.json`.
- Booking references (`RFQ-XXXXXX`) are random; nothing is sent anywhere.
- Short place descriptions were written from the brief. Where the brief gave none (for example the cafés), they say only what the place is.

## Names to check

**Chinese.** Clear transliterations or translations where no established name was certain:

| English | Chinese used | Note |
|---|---|---|
| Ramada by Wyndham | 华美达 | Wyndham's brand name in China |
| Comfort Hotel | 凯富 | Choice Hotels' Chinese brand name; please confirm |
| Luxury Collection | 豪华精选 | Marriott's Chinese brand name |
| Bab Samhan | 巴布萨姆汉 | transliteration |
| Diriyah | 德拉伊耶 | also seen as 迪里耶 |
| Olaya | 奥拉亚 | transliteration |
| Murabba Palace / station | 穆拉巴宫 / 穆拉巴站 | transliteration |
| King Abdulaziz Darah | 阿卜杜勒阿齐兹国王档案馆 | descriptive (the Darah is the archive foundation) |
| Al Masmak | 马斯马克堡博物馆 | common form |
| Souq Al Zal | 扎尔市场 | transliteration |
| Al-Afrah | 阿夫拉赫餐厅 | transliteration |
| Al Taif Kitchens | 塔伊夫厨房 | translation |
| Museum of Bygone Years | 往昔博物馆 | translation |
| Bujairi Terrace | 布贾伊里露台 | transliteration |
| Salwa Palace | 萨尔瓦宫 | transliteration |
| At-Turaif | 图赖夫 | from the brief |
| Kingdom Centre | 王国中心 | common form |
| Al Faisaliah | 费萨利亚塔 | common form |
| Passport Department / Al Urubah stations | 护照局站 / 乌鲁巴站 | not checked against Riyadh Metro's Chinese signage |
| Blue Line | 蓝线 | |
| Brand names | Marthad, illume, Maiz, Cova, The Warehouse, Bohemia, JAX 01, Al Mamlaka, MORFi, GOAT by REEHAM, The Gate | kept in Latin letters with a Chinese descriptor |
| Guide names | all eight | transliterated |

**Arabic.** Worth a native check: متحف الزمن الماضي (Museum of Bygone Years), ذا ويرهاوس, المملكة سوشال داينينغ, ذا روف في المملكة, ذا قيت للقهوة المختصة, مورفي, جوت باي ريهام, كوفا باستيتشيريا, مقهى ومحمصة إليوم, the metro station names الجوازات / المربع / العروبة, and the hotel name باب سمحان، فندق ذا لاكشري كوليكشن.

## Notes

- No emojis. Icons are Lucide outline icons; directional ones (back, arrows) flip in Arabic, the others do not.
- `prefers-reduced-motion`: the fly-in becomes a short cut, the islands appear in place, and there is no drift, twinkle or traffic pulse.
- The Saudi Tourism Authority palette is used for colour only. The logo is `public/logo.png` (also the tab icon); the crenellation motif was drawn for this app.
- Target 60 fps: pixel ratio capped at 1.75, one shadow-casting light, instanced windows and crenellations. Measured at 60 fps on an Intel Iris Xe laptop GPU.
