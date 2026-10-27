import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Settings } from 'lucide-react';
import { THEMES } from '../config';
import { getDowntown } from '../data';
import { useStore } from '../store';
import { Mark } from '../ui/Mark';
import { StarIcon } from '../ui/StarIcon';
import { Sheet } from '../ui/Sheet';

function HotelSheet({ id }: { id: string }) {
  const { t } = useTranslation();
  const d = getDowntown(id)!;
  const visited = useStore((s) => s.visited);
  const stayHere = useStore((s) => s.stayHere);
  const preview = useStore((s) => s.preview);
  const done = d.places.filter((p) => visited[p.id]).length;
  const total = d.places.length;
  const theme = THEMES[d.theme];
  return (
    <Sheet onClose={() => preview(null)} labelledBy="hotel-sheet-title" scrim={false} className="hotel-sheet">
      <div className="hotel-sheet-head" style={{ ['--district' as string]: theme.light, ['--district-dark' as string]: theme.dark }}>
        <span className="district-swatch" aria-hidden />
        <div>
          <h2 id="hotel-sheet-title" className="sheet-title">{t(`downtowns.${id}.name`)}</h2>
          <p className="sheet-sub">{t(`downtowns.${id}.hotel`)}</p>
        </div>
      </div>
      <p className="sheet-text">{t(`downtowns.${id}.vibe`)}</p>
      <p className="sheet-meta num">
        {t('city.placesCount', { count: total })}
        {done > 0 && <span> · {t('city.visitedSoFar', { done, total })}</span>}
      </p>
      <button className="btn-primary" onClick={() => stayHere(id)} data-autofocus>
        {t('city.stayHere')}
        <ArrowRight size={20} strokeWidth={2.4} className="flip-rtl" aria-hidden />
      </button>
    </Sheet>
  );
}

/**
 * A few of the logo's sparkles scattered in the empty sky beside the name and the "Riyadh" title.
 * Each one: inline-start (% of width, so Arabic mirrors it), top (px below the language bar; negative is
 * beside it), size (px), twinkle period and delay (s).
 */
const SPARKLES = [
  [5, -34, 6, 4.4, 0.4],
  [15, -16, 8, 3.9, 2.4],
  [83, -30, 7, 4.8, 1.6],
  [93, -12, 5, 3.5, 0.9],
  [46, 8, 9, 3.4, 0],
  [61, 32, 6, 4.2, 1.3],
  [72, 2, 7, 3.8, 2.1],
  [54, 62, 7, 4.6, 0.7],
  [80, 56, 10, 3.6, 1.8],
  [68, 76, 6, 4.0, 2.8],
  [39, 50, 5, 5.0, 1.1],
] as const;

function HeaderStars() {
  return (
    <div className="header-stars" aria-hidden="true">
      {SPARKLES.map(([x, y, size, duration, delay], i) => (
        <span
          key={i}
          className="header-star"
          style={{ insetInlineStart: `${x}%`, top: `calc(var(--below-bar) + ${y}px)`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}
        >
          <StarIcon size={size} />
        </span>
      ))}
    </div>
  );
}

export function CityOverview() {
  const { t } = useTranslation();
  const view = useStore((s) => s.view);
  const previewId = useStore((s) => s.previewId);
  const openSettings = useStore((s) => s.openSettings);
  const show = view === 'city';
  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.header
            key="city-top"
            className="city-top"
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
            exit={{ opacity: 0, y: -24, transition: { duration: 0.3 } }}
          >
            <HeaderStars />
            <div className="topbar">
              <div className="brand">
                <Mark size={45} />
                <span className="brand-name">{t('app.name')}</span>
              </div>
              <button className="icon-btn" onClick={() => openSettings(true)} aria-label={t('common.settings')}>
                <Settings size={20} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <motion.div className="city-heading" animate={{ opacity: previewId ? 0 : 1, y: previewId ? -8 : 0 }} transition={{ duration: 0.3 }}>
              <h1>{t('city.title')}</h1>
              <p>{t('city.subtitle')}</p>
            </motion.div>
          </motion.header>
        )}
      </AnimatePresence>
      <AnimatePresence>{show && previewId && <HotelSheet key={previewId} id={previewId} />}</AnimatePresence>
    </>
  );
}
