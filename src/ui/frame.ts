import { create } from 'zustand';

/**
 * Wider than a phone (and not a phone on its side): the app is shown inside a phone frame, scaled
 * to fit the window. Narrower: it fills the screen, as on a real phone.
 */
const FRAME_QUERY = '(min-width: 769px)';
const PHONE_LANDSCAPE_QUERY = '(max-height: 640px) and (pointer: coarse)';

export function wantsFrame() {
  return window.matchMedia(FRAME_QUERY).matches && !window.matchMedia(PHONE_LANDSCAPE_QUERY).matches;
}

/** Launched from the home screen: already a full-screen app. */
export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export const isAndroid = () => /Android/i.test(navigator.userAgent);
// iPadOS reports itself as a Mac; touch tells them apart.
export const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

interface FrameState {
  framed: boolean;
  /** How much the phone frame is scaled on screen (1 on a real phone). */
  scale: number;
}

export const useDeviceFrame = create<FrameState>()(() => ({ framed: wantsFrame(), scale: 1 }));

export function watchFrame(onChange: () => void) {
  const queries = [FRAME_QUERY, PHONE_LANDSCAPE_QUERY].map((q) => window.matchMedia(q));
  queries.forEach((m) => m.addEventListener('change', onChange));
  return () => queries.forEach((m) => m.removeEventListener('change', onChange));
}
