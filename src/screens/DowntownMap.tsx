import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, Settings } from 'lucide-react';
import { COLORS, THEMES } from '../config';
import { FILTER_CATEGORIES, getDowntown, type Category } from '../data';
import { useStore } from '../store';
import { CategoryIcon } from '../ui/CategoryIcon';

const ease = [0.22, 1, 0.36, 1] as const;

function FilterChips({ categories }: { categories: Category[] }) {
  const { t } = useTranslation();
  const filter = useStore((s) => s.filter);
  const setFilter = useStore((s) => s.setFilter);
  return (
    <div className="chips" role="toolbar" aria-label={t('map.filtersLabel')}>
      <button className={`chip${filter === null ? ' is-on' : ''}`} aria-pressed={filter === null} onClick={() => setFilter(null)}>
        {t('categories.all')}
      </button>
      {categories.map((c, i) => (
        <motion.button
          key={c}
          className={`chip${filter === c ? ' is-on' : ''}`}
          aria-pressed={filter === c}
          onClick={() => setFilter(filter === c ? null : c)}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.05, duration: 0.35, ease } }}
          whileTap={{ scale: 0.94 }}
        >
          <CategoryIcon category={c} size={16} />
          {t(`categories.${c}`)}
        </motion.button>
      ))}
    </div>
  );
}

export function DowntownMap() {
  const { t } = useTranslation();
  const view = useStore((s) => s.view);
  const id = useStore((s) => s.downtownId);
  const visited = useStore((s) => s.visited);
  const leave = useStore((s) => s.leave);
  const openSettings = useStore((s) => s.openSettings);
  const d = getDowntown(id);
  const show = view === 'downtown' && !!d;

  const present = new Set<Category>(d ? [...d.places, ...(d.bonus?.places ?? [])].map((p) => p.category) : []);
  if (d?.metro.length) present.add('metro');
  const categories = FILTER_CATEGORIES.filter((c) => present.has(c));
  const total = d?.places.length ?? 0;
  const done = d ? d.places.filter((p) => visited[p.id]).length : 0;
  const theme = d ? THEMES[d.theme] : THEMES.oldcity;

  return (
    <AnimatePresence>
      {show && d && (
        <motion.div
          key={`map-${d.id}`}
          className="map-ui passthrough"
          style={{ ['--district' as string]: theme.light, ['--district-dark' as string]: theme.dark }}
          initial="hidden"
          animate="shown"
          exit="hidden"
        >
          <motion.header
            className="map-top"
            variants={{
              hidden: { opacity: 0, y: -24, transition: { duration: 0.25 } },
              shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
            }}
          >
            <div className="map-top-row">
              <button className="icon-btn" onClick={leave} aria-label={t('map.backToCity')}>
                <ChevronLeft size={22} strokeWidth={2.2} className="flip-rtl" aria-hidden />
              </button>
              <div className="map-title">
                <h1>{t(`downtowns.${d.id}.name`)}</h1>
                <p>{t(`downtowns.${d.id}.hotelShort`)}</p>
              </div>
              <button className="icon-btn" onClick={() => openSettings(true)} aria-label={t('common.settings')}>
                <Settings size={20} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="progress" aria-label={t('map.progressLabel')}>
              <div className="progress-text num">
                <span>{t('map.progress', { done, total })}</span>
              </div>
              <div
                className="progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={done}
                aria-valuetext={t('map.progress', { done, total })}
              >
                <motion.div
                  className="progress-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${(done / Math.max(total, 1)) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 160, damping: 22, delay: 0.2 }}
                  style={{ background: COLORS.completed }}
                />
              </div>
            </div>
            <FilterChips categories={categories} />
          </motion.header>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
