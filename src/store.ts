import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category, GuideLang } from './data';

export type Lang = GuideLang;
export type View = 'city' | 'flyingIn' | 'downtown' | 'flyingOut';

export interface Booking {
  ref: string;
  guideId: string;
  downtownId: string;
  hours: number;
  date: string; // ISO date
  startHour: number;
  placeIds: string[];
  total: number;
}

interface State {
  lang: Lang;
  view: View;
  downtownId: string | null;
  previewId: string | null; // hotel sheet on the city overview
  placeId: string | null;
  filter: Category | null;
  visited: Record<string, number>;
  lastCheckIn: string | null;
  rafeeqOpen: boolean;
  guideId: string | null;
  bookings: Booking[];
  settingsOpen: boolean;
  /** The Suhail assistant's chat sheet. */
  suhailOpen: boolean;

  setLang: (l: Lang) => void;
  preview: (id: string | null) => void;
  stayHere: (id: string) => void;
  arrive: () => void;
  leave: () => void;
  backToCity: () => void;
  openPlace: (id: string | null) => void;
  setFilter: (c: Category | null) => void;
  checkIn: (id: string) => void;
  openRafeeq: (open: boolean) => void;
  openGuide: (id: string | null) => void;
  addBooking: (b: Booking) => void;
  openSettings: (open: boolean) => void;
  openSuhail: (open: boolean) => void;
  resetProgress: () => void;
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      lang: 'en',
      view: 'city',
      downtownId: null,
      previewId: null,
      placeId: null,
      filter: null,
      visited: {},
      lastCheckIn: null,
      rafeeqOpen: false,
      guideId: null,
      bookings: [],
      settingsOpen: false,
      suhailOpen: false,

      setLang: (lang) => set({ lang }),
      preview: (previewId) => set({ previewId }),
      stayHere: (id) => set({ downtownId: id, previewId: null, view: 'flyingIn', filter: null, placeId: null }),
      arrive: () => set({ view: 'downtown' }),
      leave: () => set({ view: 'flyingOut', placeId: null, rafeeqOpen: false, guideId: null, suhailOpen: false }),
      backToCity: () => set({ view: 'city', downtownId: null }),
      openPlace: (placeId) => set({ placeId }),
      setFilter: (filter) => set({ filter }),
      checkIn: (id) => set((s) => ({ visited: { ...s.visited, [id]: Date.now() }, lastCheckIn: id })),
      openRafeeq: (rafeeqOpen) => set({ rafeeqOpen, placeId: null, guideId: null, suhailOpen: false }),
      openGuide: (guideId) => set({ guideId }),
      addBooking: (b) => set((s) => ({ bookings: [...s.bookings, b] })),
      openSettings: (settingsOpen) => set({ settingsOpen }),
      openSuhail: (suhailOpen) => set({ suhailOpen, placeId: null }),
      resetProgress: () => set({ visited: {}, bookings: [], lastCheckIn: null }),
    }),
    {
      name: 'downtowns-v2',
      partialize: (s) => ({ lang: s.lang, visited: s.visited, bookings: s.bookings }),
    },
  ),
);

/**
 * Demo and test deep links: ?lang=ar&dt=ramada&visited=illume,marthad&rafeeq=1&guide=lin&suhail=1
 * Used to jump straight to a state when rehearsing or taking screenshots.
 */
export function applyDeepLink() {
  const q = new URLSearchParams(window.location.search);
  if (![...q.keys()].length) return;
  const s = useStore.getState();
  const patch: Partial<State> = {};
  const lang = q.get('lang');
  if (q.get('fresh') === '1') Object.assign(patch, { lang: 'en', visited: {}, bookings: [] });
  if (lang === 'ar' || lang === 'en' || lang === 'zh-CN') patch.lang = lang;
  const visited = q.get('visited');
  if (visited !== null) {
    patch.visited = Object.fromEntries(visited.split(',').filter(Boolean).map((id) => [id, Date.now()]));
  }
  const dt = q.get('dt');
  if (dt) Object.assign(patch, { downtownId: dt, view: 'downtown' as View });
  const pv = q.get('preview');
  if (pv) patch.previewId = pv;
  const place = q.get('place');
  if (place) patch.placeId = place;
  if (q.get('rafeeq') === '1') patch.rafeeqOpen = true;
  const guide = q.get('guide');
  if (guide) patch.guideId = guide;
  if (q.get('settings') === '1') patch.settingsOpen = true;
  if (q.get('suhail') === '1') patch.suhailOpen = true;
  useStore.setState({ ...s, ...patch });
}
