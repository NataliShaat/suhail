import { applyLanguage } from '../i18n';
import { useStore, type Lang } from '../store';

const OUT_MS = 170;

/**
 * Crossfades every piece of text: fade out, swap language and direction while nothing is visible,
 * fade back in. Progress and the open screen are untouched.
 */
export function switchLanguage(lang: Lang) {
  const root = document.querySelector('.app');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!root || reduce || useStore.getState().lang === lang) {
    applyLanguage(lang);
    useStore.getState().setLang(lang);
    return;
  }
  root.classList.add('is-switching');
  window.setTimeout(() => {
    applyLanguage(lang);
    useStore.getState().setLang(lang);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-switching')));
  }, OUT_MS);
}
