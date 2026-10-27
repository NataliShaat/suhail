import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Clock, Flag, Footprints, Lock, MapPin, Moon, Ticket, TramFront, UserRound } from 'lucide-react';
import { COLORS, THEMES } from '../config';
import { allPlaces, getDowntown, isBonusUnlocked } from '../data';
import { distanceMeters } from '../data/geo';
import { hourMinute, isOpenAt, riyadhClock, windowOn } from '../data/hours';
import { useFormat } from '../i18n';
import { useStore } from '../store';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Sheet } from '../ui/Sheet';

function Fact({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <li className="fact">
      <span className="fact-icon">{icon}</span>
      <span>{children}</span>
    </li>
  );
}

export function PlaceSheet() {
  const { t } = useTranslation();
  const f = useFormat();
  const placeId = useStore((s) => s.placeId);
  const view = useStore((s) => s.view);
  const downtownId = useStore((s) => s.downtownId);
  const visited = useStore((s) => s.visited);
  const openPlace = useStore((s) => s.openPlace);
  const checkIn = useStore((s) => s.checkIn);
  const openRafeeq = useStore((s) => s.openRafeeq);
  const d = getDowntown(downtownId);
  const open = view === 'downtown' && !!d && !!placeId;

  let body: React.ReactNode = null;
  if (open && d && placeId) {
    const place = allPlaces(d).find((p) => p.id === placeId);
    const metro = d.metro.find((m) => m.id === placeId);
    const target = place ?? metro;
    if (target) {
      const meters = distanceMeters(target.lat, target.lng, d.hotel.lat, d.hotel.lng);
      const walkMin = Math.max(1, Math.round(meters / 80));
      const isBonus = !!d.bonus?.places.some((p) => p.id === placeId);
      const locked = isBonus && !isBonusUnlocked(d, visited);
      const theme = THEMES[isBonus ? 'nightlife' : d.theme];
      const done = visited[placeId];
      const category = place ? place.category : 'metro';
      const clock = riyadhClock();
      const today = place ? windowOn(place.hours, clock.day) : null;
      const openNow = !!place && isOpenAt(place.hours, clock.day, clock.minute);

      body = (
        <div style={{ ['--district' as string]: theme.light, ['--district-dark' as string]: theme.dark }}>
          <div className="place-head">
            <span className={`place-icon${metro ? ' is-metro' : ''}`}>
              {metro ? <TramFront size={22} strokeWidth={2} aria-hidden /> : <CategoryIcon category={category} size={22} />}
            </span>
            <div className="place-head-text">
              <h2 id="place-sheet-title" className="sheet-title">{t(`places.${placeId}.name`)}</h2>
              <p className="sheet-sub">
                {metro ? `${t('metro.station')} · ${t('metro.blue')}` : t(`categories.${category}`)}
                {place?.alsoCoffee && ` · ${t('place.alsoCoffee')}`}
                {isBonus && ` · ${t('places.jax.name')}`}
              </p>
            </div>
          </div>
          {place?.final && (
            <p className="final-tag">
              <Flag size={14} strokeWidth={2.4} aria-hidden /> {t('map.finalStop')}
            </p>
          )}
          {place && <p className="sheet-text">{t(`places.${placeId}.desc`)}</p>}
          <ul className="facts">
            <Fact icon={<MapPin size={18} strokeWidth={2} aria-hidden />}>
              <span className="num">{t('place.distance', { distance: f.distance(meters) })}</span>
            </Fact>
            {meters < 2500 && (
              <Fact icon={<Footprints size={18} strokeWidth={2} aria-hidden />}>
                <span className="num">{t('place.walk', { minutes: f.num(walkMin) })}</span>
              </Fact>
            )}
            {place && (
              <Fact icon={<Clock size={18} strokeWidth={2} aria-hidden />}>
                <span className="num">
                  <strong className={openNow ? 'hours-open' : 'hours-closed'}>{openNow ? t('place.openNow') : t('place.closedNow')}</strong>
                  {' · '}
                  {today
                    ? t('place.hoursToday', { from: f.time(...hourMinute(today[0])), to: f.time(...hourMinute(today[1])) })
                    : t('place.closedToday')}
                </span>
              </Fact>
            )}
            {place?.evening && <Fact icon={<Moon size={18} strokeWidth={2} aria-hidden />}>{t('place.evening')}</Fact>}
            {place?.free && <Fact icon={<Ticket size={18} strokeWidth={2} aria-hidden />}>{t('place.freeEntry')}</Fact>}
          </ul>

          {place && locked && (
            <div className="locked-box">
              <p>
                <Lock size={16} strokeWidth={2.2} aria-hidden /> {t('map.bonusLocked')}
              </p>
              <button className="btn-primary" onClick={() => openRafeeq(true)} data-autofocus>
                <UserRound size={20} strokeWidth={2.2} aria-hidden />
                {t('place.goWithRafeeq')}
              </button>
            </div>
          )}
          {place && !locked && (
            <AnimatePresence mode="wait" initial={false}>
              {done ? (
                <motion.div
                  key="done"
                  className="checked"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 24 }}
                  role="status"
                >
                  <motion.span
                    className="checked-disc"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 14, delay: 0.05 }}
                    style={{ background: COLORS.completed }}
                  >
                    <Check size={20} strokeWidth={3.2} aria-hidden />
                  </motion.span>
                  <span className="num">{t('place.checkedInAt', { time: f.clock(done) })}</span>
                </motion.div>
              ) : (
                <motion.button
                  key="todo"
                  className="btn-primary"
                  onClick={() => {
                    checkIn(placeId);
                    window.setTimeout(() => openPlace(null), 1100);
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  data-autofocus
                >
                  <Check size={20} strokeWidth={2.6} aria-hidden />
                  {t('place.checkIn')}
                </motion.button>
              )}
            </AnimatePresence>
          )}
        </div>
      );
    }
  }

  return (
    <AnimatePresence>
      {open && body && (
        <Sheet key={placeId} onClose={() => openPlace(null)} labelledBy="place-sheet-title" scrim={false} className="place-sheet">
          {body}
        </Sheet>
      )}
    </AnimatePresence>
  );
}
