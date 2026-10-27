# Build: hotel downtowns tourism app (hackathon prototype)

Use the `design-taste-frontend` skill for all visual decisions. Before writing code, read this whole brief, then reply with a short build plan (phases and file structure) and a list of any images or assets you need from me. Then build it phase by phase.

## The idea

A Saudi tourism app that redefines how visitors experience Riyadh. Every hotel becomes the heart of its own "downtown": a themed district around it with its museums, cafés, restaurants, music venues, and metro stations. The visitor explores their downtown like a game map, and every place they visit gets checked off.

The second feature is **Rafeeq** (رفيق, "companion"): book a licensed local tour guide by the hour (3, 6, or 12 hours, or a custom slot) directly in the app, instead of going through a tour office.

The app name is not decided yet. Put it in one config constant (`APP_NAME = "[APP NAME]"`) so it can be changed in one place.

## What it must feel like

- A **mobile app, not a website.** Build for a 390×844 phone viewport. On desktop, show it centered inside a clean phone frame so it can be demoed on a laptop. No browser-style navbars, no footers, no hover-only interactions.
- **Professional, but feels like a game.** The reference is the classic illustrated "island level map" (islands joined by a dashed path, each island a little diorama). Keep the game mechanics, but keep the visuals calm, premium, and clean, not cartoonish.
- **Breathtaking motion.** Every transition must be smooth, clear, and meaningful: camera fly-ins, shared-element transitions, springy bottom sheets, a path that draws itself, a check that pops in. Motion should explain where the user is going. Respect `prefers-reduced-motion`.
- **No emojis anywhere.** Icons only, from one consistent outline icon set (Lucide or Tabler).
- **The three hotels are in 3D.**

## Tech stack (suggested; propose changes if you have a better reason)

- Vite + React + TypeScript
- react-three-fiber + drei for the 3D city and hotels
- Framer Motion for UI transitions, bottom sheets, and shared layouts
- Lucide (or Tabler) icons
- Fonts from Google Fonts: **Montserrat** (Latin), **Tajawal** or **IBM Plex Sans Arabic** (Arabic), and **Noto Sans SC** (Chinese), loaded per language so the app stays fast
- An i18n library (for example i18next / react-i18next) with one translation file per language
- All data is local JSON for the prototype (no API keys needed to run it)

## Color palette

Base brand (used everywhere):

| Token | Hex | Use |
|---|---|---|
| night | #1C1A3A | primary background, the "city sea" at night |
| gold | #E3A83C | primary accent, CTAs, the user's position marker |
| sand | #F3E9DA | light surfaces, cards |
| stone | #4C4D4C | secondary text on light |
| white | #FFFFFF | text on dark |

District colors (from the Saudi Tourism Authority official palette; light and dark hue each). Each downtown glows in its own color:

| District type | Light | Dark | Used for |
|---|---|---|---|
| Old city | #FF424C | #BE0000 | Ramada downtown |
| Heritage | #FF8300 | #FF5600 | Bab Samhan (Diriyah) downtown |
| Modern | #3DC2C2 | #009AAC | Comfort Olaya downtown |
| Nightlife / music | #BE008D | #78006E | music and art places (JAX District) |
| Completed | #51C041 | #389741 | green check on visited places |

Important: use only the colors. Do not copy the Saudi Tourism Authority's logo, patterns, or fonts; this app must have its own identity. If you want a decorative motif, design an original geometric one inspired by Najdi architecture (triangles, stepped crenellations).

## Screens and flow

### 1. City overview (home)

- Riyadh at night as the "sea": the night color with a faint glowing street grid instead of water.
- Three downtown "islands" floating on it, each a raised diorama tile whose edge glows in its district color.
- In the center of each island is its **3D hotel**, the main piece. Smaller stylized buildings around it hint at what's in that downtown (a fort, a museum, towers).
- Gentle idle motion: slight camera drift, lights twinkling in windows.
- Tapping a hotel opens a bottom sheet: hotel name, downtown name, a one-line vibe, the number of places to explore, and a primary button: **"I'm staying here."**

### 2. Fly-in transition

- Pressing "I'm staying here" makes the camera fly into that island: the other islands fade and sink, the chosen island grows and tilts into the map view. This is the signature moment of the demo; make it smooth and cinematic (about 1.2 to 1.6 seconds, eased).

### 3. Downtown map

- The downtown is now the whole map. The hotel is the "home island" where the user's marker starts.
- Each place is its own small island, connected by a dashed path that draws itself on entry.
- Each place has a category icon badge: museum or heritage, food, coffee, music or art, landmark or view, metro station.
- Filter chips at the top for the categories.
- States: unvisited places look slightly faded; visited places get a green check badge that pops in, and the path up to them turns solid.
- A progress indicator: "3 of 8 places".
- Tapping a place opens a detail sheet: name, category, short description, distance from the hotel, opening hours, and a **"Check in"** button (simulated for the demo; it marks the place as visited with the check animation).
- Metro stations appear as their own icon on the map edge with the line name.
- A back control returns to the city overview with the reverse fly-out animation.

### 4. Book a guide (Rafeeq)

- A persistent floating button at the bottom of the downtown map: **"Book a Rafeeq."**
- It opens the Rafeeq screen with a shared-element transition.
- A list of guide cards. **No photos of people.** Use illustrated avatar icons or monogram circles in the district color.
- Each card: name, languages, specialties (for example history, food, architecture), rating, hourly rate in SAR, and an availability tag.
- Tapping a guide opens a booking sheet: duration picker (3 h, 6 h, 12 h, or custom), date and start time, which places from the downtown map to include, total price, and a **"Confirm booking"** button.
- A confirmation state with a satisfying animation.
- Use realistic but clearly fictional guide data (invented names, not real people).

## The three hotels and their downtowns

Use these as local JSON. The coordinates are real; position the islands on the stylized map by projecting latitude and longitude relative to each hotel, so the layout matches reality without needing a live map.

### Ramada by Wyndham Riyadh, King Fahd Road: "The Old Capital" (old city red)

- Hotel: 24-floor tower in Al Namudhajiyah, opened 2022. Coordinates 24.66025, 46.70037.
- 3D look: a tall slim rectangular tower with a glowing red vertical edge strip and a red sign at the top, lit windows, palm trees at the base.
- Places:
  - The National Museum (heritage), 24.64810, 46.71095. History of Arabia, free entry.
  - Murabba Historical Palace (heritage), 24.64655, 46.70917. Mud-brick palace, vintage royal cars, free entry.
  - King Abdulaziz Darah (heritage), 24.64651, 46.70931.
  - Al Masmak Palace Museum (heritage, final stop), 24.63121, 46.71338. Next to Souq Al Zal.
  - Al-Afrah (food), 24.65049, 46.70601. Traditional Saudi breakfast.
  - Al Taif Kitchens (food), 24.66838, 46.70917. Mandi.
  - Marthad Specialty Coffee (coffee), 24.65998, 46.70431.
  - illume Café and Roastery (coffee), 24.66764, 46.70134.
  - Metro: Passport Department station, Blue Line, 24.65947, 46.70464. Al Murabba station, Blue Line, 24.66461, 46.70219.

### Bab Samhan, a Luxury Collection Hotel, Diriyah: "The Heritage Village" (heritage orange)

- Hotel: low-rise Najdi village layout. Coordinates 24.73988, 46.57228.
- 3D look: a cluster of earthy mud-brick blocks with stepped crenellated rooftops, small square windows, striped shade sails over a courtyard, warm lanterns.
- Places:
  - Museum of Bygone Years (heritage), 24.74133, 46.57180. An old Saudi house.
  - Bujairi Terrace (food), 24.73732, 46.57480. Dining overlooking At-Turaif.
  - At-Turaif World Heritage Site (heritage, final stop), 24.73361, 46.57465. UNESCO site, opens in the evening.
  - Diriyah History Museum in Salwa Palace (heritage), 24.73380, 46.57513.
  - At-Turaif Viewpoint (landmark), 24.73567, 46.57710.
  - Maiz (food), 24.73681, 46.57413. Saudi fine dining.
  - Cova Pasticceria (coffee), 24.73656, 46.57532.
  - Bonus zone, unlocked after the heritage path, reached by car or with a Rafeeq: **JAX District**, the converted warehouse arts district about 3.5 km west.
    - The Warehouse (music), 24.74506, 46.53803. Live music venue.
    - Bohemia Café and Records (music and coffee), 24.74513, 46.53790.
    - Jax 01 (art), 24.74741, 46.53869. Main gallery hall.
  - Metro: none yet (a Red Line extension to Diriyah is planned). Show a "Ride with a Rafeeq" hint instead.

### Comfort Hotel Riyadh Olaya: "The Skyline District" (modern teal)

- Hotel: mid-rise business hotel, remodeled 2023. Coordinates 24.70695, 46.67713.
- 3D look: a modern 10-floor block with a stone frame and glass, plus the Kingdom Centre silhouette (tall tower with an inverted-arch opening at the top) nearby as a landmark.
- Places:
  - Kingdom Centre Sky Bridge (landmark, final stop), 24.71129, 46.67446.
  - Al Mamlaka Social Dining (food), 24.71148, 46.67447. Food hall inside Kingdom Centre.
  - The Roof at Al Mamlaka (food), 24.71140, 46.67443.
  - Al Faisaliah Tower (landmark), 24.69021, 46.68514. Observation deck and mall.
  - MORFi (coffee), 24.70653, 46.67926.
  - GOAT by REEHAM (coffee), 24.70761, 46.67876.
  - The Gate Specialty Coffee (coffee), 24.71462, 46.67402.
  - Metro: Al Urubah station, Blue Line, 24.71347, 46.67518.

## 3D hotels

- Build the three hotels procedurally in three.js from simple geometry, in a stylized low-poly style that matches the island-map look (soft lighting, warm window lights, subtle ambient occlusion). Do not aim for photorealism.
- Structure the code so each hotel can later be swapped for a GLB model dropped into `/public/models/` without changing the scene code.
- Keep performance smooth on a laptop and a mid-range phone (target 60 fps; cap pixel ratio).

## Languages

The app supports three languages from day one: **Arabic (ar), English (en), and Chinese Simplified (zh-CN)**.

- A language switcher that's easy to reach: on the first screen (a short language choice on first launch) and in settings. Show each language in its own script: العربية, English, 中文.
- Switching language must be instant and animated (a smooth crossfade), without reloading or losing the user's map progress.
- **Arabic is right-to-left.** The whole layout must mirror correctly: navigation, bottom sheets, back arrows, progress bars, the path direction on the map, and the order of chips and cards. Use CSS logical properties (`margin-inline-start`, etc.) instead of left/right everywhere. Icons that show direction (arrows, chevrons) must flip; icons that don't (metro, food, check) must not.
- **Every string comes from the translation files**, including place names, place descriptions, categories, guide specialties, buttons, and error and empty states. Nothing is hardcoded in the components.
- Use the official or commonly used name of each place in each language (for example At-Turaif / الطريف / 图赖夫). If a Chinese name isn't established, use a clear transliteration and flag it in a list for me to check.
- Numbers, prices, dates, and times follow each locale (use `Intl.NumberFormat` and `Intl.DateTimeFormat`). Prices are in SAR in all three: "120 SAR", "120 ريال", "120 里亚尔".
- Line height and font size are tuned per script so Arabic and Chinese text don't look cramped or clipped. Test every screen in all three languages; no text overflowing or cut off in any of them.
- Guides on the Rafeeq screen list which of the three languages they speak, with a filter for it. A Chinese-speaking guide filter is a key feature for the demo.

## Reference images

The real hotel photos are in `/assets/references/`:

- `ramada.png`: Ramada tower at night
- `bab-samhan.png`: Bab Samhan courtyard
- `comfort-olaya.png`: Comfort Hotel with Kingdom Centre behind it
- `island-map-reference.png`: the island level map style reference

Use them only as references for shape, color, and mood. Do not display the hotel photos as-is in the app.

## Rules

- No emojis anywhere, in UI or code comments shown to users.
- No lorem ipsum. Use the real place data above; anything missing becomes a clear placeholder like `[PRICE]`.
- The app is fully **trilingual: Arabic, English, and Chinese (Simplified)**. See the Languages section.
- Touch targets at least 44 px, readable contrast on the night background.
- If you need an image or asset you can't generate well yourself, stop and tell me exactly what to find (subject, style, size, format).

## Definition of done for the demo

The judges should be able to: open the app, see the three glowing downtowns, tap a hotel, choose "I'm staying here," watch the fly-in, check in at two or three places and see the green checks, open "Book a Rafeeq," pick a guide, choose 3 hours, and confirm. That whole flow should take under two minutes and feel seamless, and it should work end to end in Arabic, English, and Chinese, with a live language switch during the demo.
