import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ShieldCheck, Star, UserRound } from 'lucide-react';
import { THEMES } from '../config';
import { DOWNTOWNS, GUIDES, getDowntown, type Guide, type GuideLang } from '../data';
import { ensureFont, LANG_SELF_NAME, useFormat } from '../i18n';
import { useStore } from '../store';
import { BookingSheet } from './Booking';

const ease = [0.22, 1, 0.36, 1] as const;

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function Monogram({ name, color, size = 52 }: { name: string; color: string; size?: number }) {
  const ink = luminance(color) > 0.18 ? '#1C1A3A' : '#FFFFFF';
  return (
    <span className="monogram" style={{ width: size, height: size, background: color, color: ink, fontSize: size * 0.42 }} aria-hidden>
      {Array.from(name)[0]}
    </span>
  );
}

export function guideColor(index: number, theme: { light: string; dark: string }) {
  return index % 2 ? theme.dark : theme.light;
}

function AvailabilityTag({ g }: { g: Guide }) {
  const { t } = useTranslation();
  const f = useFormat();
  const a = g.availability;
  const text = a.kind === 'now' ? t('rafeeq.availableNow') : a.kind === 'tomorrow' ? t('rafeeq.availableTomorrow') : t('rafeeq.availableFrom', { time: f.time(a.hour) });
  return <span className={`tag tag-${a.kind}`}>{text}</span>;
}

function GuideCard({ g, index, color, showAreas, onOpen }: { g: Guide; index: number; color: string; showAreas: boolean; onOpen: () => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const name = t(`guides.${g.id}`);
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0, transition: { delay: 0.12 + index * 0.05, duration: 0.42, ease } }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
    >
      <button className="guide-card" onClick={onOpen}>
        <Monogram name={name} color={color} />
        <span className="guide-main">
          <span className="guide-row">
            <span className="guide-name">{name}</span>
            <span className="guide-rating num" aria-label={t('rafeeq.rating', { rating: f.num(g.rating, 1) })}>
              <Star size={14} strokeWidth={0} fill="#C98F25" aria-hidden />
              {f.num(g.rating, 1)}
            </span>
          </span>
          <span className="guide-specs">{g.specialties.map((s) => t(`specialties.${s}`)).join(' · ')}</span>
          {showAreas && (
            <span className="guide-areas">
              {g.downtowns.map((id) => (
                <span key={id} className="guide-area" style={{ ['--dot' as string]: THEMES[getDowntown(id)!.theme].light }}>
                  {t(`downtowns.${id}.name`)}
                </span>
              ))}
            </span>
          )}
          <span className="guide-langs">
            {g.languages.map((l) => (
              <span key={l} className="lang-pill" lang={l}>
                {LANG_SELF_NAME[l]}
              </span>
            ))}
          </span>
          <span className="guide-row guide-foot">
            <span className="guide-rate num">{t('rafeeq.perHour', { price: f.price(g.rate) })}</span>
            <AvailabilityTag g={g} />
          </span>
        </span>
      </button>
    </motion.li>
  );
}

export function RafeeqScreen() {
  const { t } = useTranslation();
  const rafeeqOpen = useStore((s) => s.rafeeqOpen);
  const openRafeeq = useStore((s) => s.openRafeeq);
  const openGuide = useStore((s) => s.openGuide);
  const view = useStore((s) => s.view);
  const downtownId = useStore((s) => s.downtownId);
  const d = getDowntown(downtownId);
  const [lang, setLang] = useState<GuideLang | 'any'>('any');
  // Inside a downtown the list starts on that downtown's guides; before a hotel is chosen, on all three.
  const [area, setArea] = useState<string>('all');
  const open = rafeeqOpen && (view === 'downtown' || view === 'city');
  useEffect(() => {
    if (open) setArea(d ? d.id : 'all');
  }, [open, d]);
  const areaTheme = THEMES[getDowntown(area)?.theme ?? d?.theme ?? 'oldcity'];
  const theme = areaTheme;

  const list = useMemo(
    () => GUIDES.filter((g) => (area === 'all' || g.downtowns.includes(area)) && (lang === 'any' || g.languages.includes(lang))),
    [lang, area],
  );
  /** The downtown a booking is for: the filtered one, else the current one, else the guide's first. */
  const bookingArea = (g: Guide) => (area !== 'all' && g.downtowns.includes(area) ? area : d && g.downtowns.includes(d.id) ? d.id : g.downtowns[0]);
  const guideId = useStore((s) => s.guideId);
  const booked = GUIDES.find((g) => g.id === guideId);
  // Guides list their languages in their own scripts, so every script's font is needed here.
  useEffect(() => {
    if (open) { ensureFont('ar'); ensureFont('zh-CN'); }
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            key="rafeeq"
            layoutId="rafeeq-surface"
            className="rafeeq"
            style={{ borderRadius: 0, ['--district' as string]: theme.light, ['--district-dark' as string]: theme.dark }}
            transition={{ type: 'spring', stiffness: 260, damping: 32 }}
            aria-labelledby="rafeeq-title"
          >
            <motion.div
              className="rafeeq-inner"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.3 } }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
            >
              <header className="rafeeq-head">
                <button className="icon-btn on-sand" onClick={() => openRafeeq(false)} aria-label={t('common.back')}>
                  <ChevronLeft size={22} strokeWidth={2.2} className="flip-rtl" aria-hidden />
                </button>
                <div className="rafeeq-title">
                  <span className="rafeeq-badge" aria-hidden>
                    <UserRound size={20} strokeWidth={2.2} />
                  </span>
                  <div>
                    <h1 id="rafeeq-title">{t('rafeeq.title')}</h1>
                    <p>{t('rafeeq.subtitle')}</p>
                  </div>
                </div>
              </header>

              <div className="lang-filter" role="radiogroup" aria-label={t('rafeeq.area')}>
                <span className="lang-filter-label">{t('rafeeq.area')}</span>
                <div className="area-row">
                  {['all', ...DOWNTOWNS.map((x) => x.id)].map((id) => {
                    const on = area === id;
                    const dot = id === 'all' ? null : THEMES[getDowntown(id)!.theme].light;
                    return (
                      <button key={id} role="radio" aria-checked={on} className={`area-chip${on ? ' is-on' : ''}`} onClick={() => setArea(id)}>
                        {dot && <span className="area-dot" style={{ background: dot }} aria-hidden />}
                        {id === 'all' ? t('rafeeq.allAreas') : t(`downtowns.${id}.name`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lang-filter" role="radiogroup" aria-label={t('rafeeq.speaks')}>
                <span className="lang-filter-label">{t('rafeeq.speaks')}</span>
                <div className="segmented">
                  {(['any', 'ar', 'en', 'zh-CN'] as const).map((l) => (
                    <button
                      key={l}
                      role="radio"
                      aria-checked={lang === l}
                      className={`seg${lang === l ? ' is-on' : ''}`}
                      onClick={() => setLang(l)}
                      lang={l === 'any' ? undefined : l}
                    >
                      {lang === l && <motion.span layoutId="lang-seg" className="seg-bg" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
                      <span className="seg-text">{l === 'any' ? t('rafeeq.anyLanguage') : LANG_SELF_NAME[l]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <p className="rafeeq-count num" aria-live="polite">
                <ShieldCheck size={16} strokeWidth={2.2} aria-hidden />
                {t('rafeeq.countGuides', { count: list.length })} · {t('rafeeq.allLicensed')}
              </p>

              <ul className="guide-list">
                <AnimatePresence mode="popLayout">
                  {list.map((g) => {
                    const i = GUIDES.indexOf(g);
                    const own = area === 'all' ? THEMES[getDowntown(g.downtowns[0])!.theme] : theme;
                    return <GuideCard key={g.id} g={g} index={list.indexOf(g)} color={guideColor(i, own)} showAreas={area === 'all'} onOpen={() => openGuide(g.id)} />;
                  })}
                </AnimatePresence>
                {list.length === 0 && (
                  <li className="empty">{t('rafeeq.empty', { language: lang === 'any' ? '' : LANG_SELF_NAME[lang] })}</li>
                )}
              </ul>
            </motion.div>
          </motion.section>
        )}
      </AnimatePresence>
      <BookingSheet downtownId={booked ? bookingArea(booked) : null} />
    </>
  );
}
