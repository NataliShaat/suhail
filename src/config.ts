// The app's name in Latin letters (page title, manifest). Each language has its own in i18n `app.name`:
// Suhail, سُهَيْل, 苏海尔. Suhail is the Arabic name of Canopus, the star that guided desert travellers.
export const APP_NAME = 'Suhail';

export const COLORS = {
  night: '#1C1A3A',
  nightDeep: '#14122B',
  nightRaised: '#26244A',
  nightLine: '#36345C',
  gold: '#E3A83C',
  sand: '#F3E9DA',
  stone: '#4C4D4C',
  white: '#FFFFFF',
  completed: '#51C041',
  completedDark: '#389741',
  metroBlue: '#2F8FD8',
} as const;

export type ThemeId = 'oldcity' | 'heritage' | 'modern' | 'nightlife';

export const THEMES: Record<ThemeId, { light: string; dark: string }> = {
  oldcity: { light: '#FF424C', dark: '#BE0000' },
  heritage: { light: '#FF8300', dark: '#FF5600' },
  modern: { light: '#3DC2C2', dark: '#009AAC' },
  nightlife: { light: '#BE008D', dark: '#78006E' },
};

// Arabic mirrors the stylised downtown map left to right so the route reads in the reading direction.
// Set to false to keep the map geographic (east on the right) in every language.
export const MIRROR_MAP_IN_RTL = true;

// Fly-in / fly-out duration in seconds.
export const FLY_DURATION = 1.45;
