import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import en from './en.json';
import ar from './ar.json';
import zh from './zh-CN.json';
import type { Lang } from '../store';

export const LANGS: { id: Lang; label: string }[] = [
  { id: 'ar', label: 'العربية' },
  { id: 'en', label: 'English' },
  { id: 'zh-CN', label: '中文' },
];

/** Each language's own name, in its own script. Never translated. */
export const LANG_SELF_NAME: Record<Lang, string> = { ar: 'العربية', en: 'English', 'zh-CN': '中文' };

// Saudi Arabic with Latin digits and the Gregorian calendar (ar-SA defaults to Umm al-Qura).
const INTL_LOCALE: Record<Lang, string> = {
  ar: 'ar-SA-u-nu-latn-ca-gregory',
  en: 'en-GB',
  'zh-CN': 'zh-CN',
};

export const isRtl = (l: Lang) => l === 'ar';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ar: { translation: ar }, 'zh-CN': { translation: zh } },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

const FONT_URLS: Partial<Record<Lang, string>> = {
  ar: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap',
  'zh-CN': 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;500;700&display=swap',
};

/** Loads a script's font only when that language is first used, so the app stays light. */
export function ensureFont(lang: Lang) {
  const href = FONT_URLS[lang];
  if (!href) return;
  const id = `font-${lang}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

export function applyLanguage(lang: Lang) {
  ensureFont(lang);
  i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = isRtl(lang) ? 'rtl' : 'ltr';
  document.title = i18n.t('app.name');
}

/** Locale-aware formatters for the current language. */
export function useFormat() {
  const { t, i18n: inst } = useTranslation();
  const lang = (inst.language || 'en') as Lang;
  const loc = INTL_LOCALE[lang] ?? 'en-GB';
  const num = (n: number, digits = 0) =>
    new Intl.NumberFormat(loc, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  return {
    lang,
    locale: loc,
    num,
    price: (amount: number) => t('price', { amount: num(amount) }),
    distance: (meters: number) =>
      meters < 1000
        ? new Intl.NumberFormat(loc, { style: 'unit', unit: 'meter', unitDisplay: 'short', maximumFractionDigits: 0 }).format(Math.round(meters / 10) * 10)
        : new Intl.NumberFormat(loc, { style: 'unit', unit: 'kilometer', unitDisplay: 'short', maximumFractionDigits: 1 }).format(meters / 1000),
    time: (hour: number, minute = 0) => {
      const d = new Date(2026, 0, 1, hour, minute);
      return new Intl.DateTimeFormat(loc, { hour: 'numeric', minute: '2-digit' }).format(d);
    },
    clock: (ts: number) => new Intl.DateTimeFormat(loc, { hour: 'numeric', minute: '2-digit' }).format(new Date(ts)),
    weekday: (d: Date) => new Intl.DateTimeFormat(loc, { weekday: 'short' }).format(d),
    dayNum: (d: Date) => new Intl.DateTimeFormat(loc, { day: 'numeric' }).format(d),
    longDate: (d: Date) => new Intl.DateTimeFormat(loc, { weekday: 'long', day: 'numeric', month: 'long' }).format(d),
  };
}

export default i18n;
