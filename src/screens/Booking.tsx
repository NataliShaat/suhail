import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Minus, Plus } from 'lucide-react';
import { COLORS, THEMES } from '../config';
import { GUIDES, getDowntown, type Guide } from '../data';
import { useFormat } from '../i18n';
import { useStore, type Booking } from '../store';
import { CategoryIcon } from '../ui/CategoryIcon';
import { Sheet } from '../ui/Sheet';
import { Monogram, guideColor } from './Rafeeq';

const PRESETS = [3, 6, 12] as const;
const START_HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

function addDays(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSlotOpen(g: Guide, dayIndex: number, hour: number, nowHour: number) {
  const a = g.availability;
  if (a.kind === 'tomorrow' && dayIndex === 0) return false;
  if (dayIndex === 0 && hour <= nowHour) return false;
  if (a.kind === 'from' && dayIndex === 0 && hour < a.hour) return false;
  return true;
}

function makeRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `RFQ-${s}`;
}

function Confirmation({ booking, name, onDone }: { booking: Booking; name: string; onDone: () => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const date = new Date(booking.date);
  return (
    <motion.div className="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="status">
      <div className="confirm-mark" aria-hidden>
        <motion.span
          className="confirm-burst"
          initial={{ scale: 0.4, opacity: 0.8 }}
          animate={{ scale: 2.1, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.25 }}
        />
        <svg viewBox="0 0 96 96" width="96" height="96">
          <motion.circle
            cx="48" cy="48" r="44" fill="none" stroke={COLORS.completed} strokeWidth="6" strokeLinecap="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
            style={{ rotate: -90, transformOrigin: '50% 50%' }}
          />
          <motion.circle
            cx="48" cy="48" r="36" fill={COLORS.completed}
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 380, damping: 14, delay: 0.4 }}
            style={{ transformOrigin: '50% 50%' }}
          />
          <motion.path
            d="M31 49 L43 61 L66 37" fill="none" stroke="#FFFFFF" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
            initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.62, ease: 'easeOut' }}
          />
        </svg>
      </div>
      <motion.h2 id="booking-title" className="sheet-title" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}>
        {t('booking.confirmed')}
      </motion.h2>
      <motion.p className="sheet-text" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.78 }}>
        {t('booking.summary', { name, date: f.longDate(date), time: f.time(booking.startHour) })}
      </motion.p>
      <motion.dl className="confirm-facts" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.86 }}>
        <div>
          <dt>{t('booking.reference')}</dt>
          <dd className="num" dir="ltr">{booking.ref}</dd>
        </div>
        <div>
          <dt>{t('booking.duration')}</dt>
          <dd className="num">{t('booking.hours', { count: booking.hours })}</dd>
        </div>
        <div>
          <dt>{t('booking.total')}</dt>
          <dd className="num">{f.price(booking.total)}</dd>
        </div>
      </motion.dl>
      <button className="btn-primary" onClick={onDone} data-autofocus>
        {t('booking.backToMap')}
      </button>
    </motion.div>
  );
}

function BookingForm({ g, index, downtownId }: { g: Guide; index: number; downtownId: string }) {
  const { t } = useTranslation();
  const f = useFormat();
  const addBooking = useStore((s) => s.addBooking);
  const openRafeeq = useStore((s) => s.openRafeeq);
  const d = getDowntown(downtownId)!;
  const theme = THEMES[d.theme];
  const name = t(`guides.${g.id}`);

  const today = useMemo(() => addDays(new Date(), 0), []);
  const nowHour = new Date().getHours();
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(today, i)), [today]);

  const [preset, setPreset] = useState<number | 'custom'>(3);
  const [custom, setCustom] = useState(4);
  const hours = preset === 'custom' ? custom : preset;

  const firstDay = days.findIndex((_, i) => START_HOURS.some((h) => isSlotOpen(g, i, h, nowHour)));
  const [day, setDay] = useState(Math.max(0, firstDay));
  const firstHour = START_HOURS.find((h) => isSlotOpen(g, day, h, nowHour)) ?? 10;
  const [start, setStart] = useState<number>(firstHour);
  useEffect(() => {
    if (!isSlotOpen(g, day, start, nowHour)) setStart(START_HOURS.find((h) => isSlotOpen(g, day, h, nowHour)) ?? 10);
  }, [day, g, start, nowHour]);

  const routePlaces = d.places;
  const finalId = d.places.find((p) => p.final)?.id;
  const [picked, setPicked] = useState<string[]>(finalId ? [finalId] : []);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const total = g.rate * hours;
  const [done, setDone] = useState<Booking | null>(null);

  if (done) return <Confirmation booking={done} name={name} onDone={() => openRafeeq(false)} />;

  const confirm = () => {
    const b: Booking = {
      ref: makeRef(),
      guideId: g.id,
      downtownId: d.id,
      hours,
      date: days[day].toISOString(),
      startHour: start,
      placeIds: picked,
      total,
    };
    addBooking(b);
    setDone(b);
  };

  return (
    <div className="booking">
      <div className="booking-head">
        <Monogram name={name} color={guideColor(index, theme)} size={48} />
        <div>
          <h2 id="booking-title" className="sheet-title">{t('booking.title', { name })}</h2>
          <p className="sheet-sub num">
            {t(`downtowns.${d.id}.name`)} · {t('rafeeq.perHour', { price: f.price(g.rate) })}
          </p>
        </div>
      </div>

      <section className="field">
        <h3 className="field-label">{t('booking.duration')}</h3>
        <div className="segmented on-sand" role="radiogroup" aria-label={t('booking.duration')}>
          {[...PRESETS, 'custom' as const].map((p) => (
            <button key={p} role="radio" aria-checked={preset === p} className={`seg${preset === p ? ' is-on' : ''}`} onClick={() => setPreset(p)}>
              {preset === p && <motion.span layoutId="dur-seg" className="seg-bg" transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
              <span className="seg-text num">{p === 'custom' ? t('booking.custom') : t('booking.hoursShort', { count: p })}</span>
            </button>
          ))}
        </div>
        <AnimatePresence initial={false}>
          {preset === 'custom' && (
            <motion.div
              className="stepper"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            >
              <div className="stepper-inner">
                <button className="icon-btn on-sand" onClick={() => setCustom((c) => Math.max(1, c - 1))} disabled={custom <= 1} aria-label={t('booking.fewer')}>
                  <Minus size={18} strokeWidth={2.4} aria-hidden />
                </button>
                <span className="stepper-value num" aria-live="polite">{t('booking.hours', { count: custom })}</span>
                <button className="icon-btn on-sand" onClick={() => setCustom((c) => Math.min(12, c + 1))} disabled={custom >= 12} aria-label={t('booking.more')}>
                  <Plus size={18} strokeWidth={2.4} aria-hidden />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="field">
        <h3 className="field-label">{t('booking.date')}</h3>
        <div className="day-row" role="radiogroup" aria-label={t('booking.date')}>
          {days.map((dt, i) => {
            const enabled = START_HOURS.some((h) => isSlotOpen(g, i, h, nowHour));
            return (
              <button
                key={i}
                role="radio"
                aria-checked={day === i}
                aria-label={f.longDate(dt)}
                className={`day${day === i ? ' is-on' : ''}`}
                disabled={!enabled}
                onClick={() => setDay(i)}
              >
                <span className="day-week">{f.weekday(dt)}</span>
                <span className="day-num num">{f.dayNum(dt)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="field">
        <h3 className="field-label">{t('booking.start')}</h3>
        <div className="time-row" role="radiogroup" aria-label={t('booking.start')}>
          {START_HOURS.map((h) => {
            const ok = isSlotOpen(g, day, h, nowHour);
            return (
              <button
                key={h}
                role="radio"
                aria-checked={start === h}
                className={`time${start === h ? ' is-on' : ''}`}
                disabled={!ok}
                title={ok ? undefined : t('booking.unavailable')}
                onClick={() => setStart(h)}
              >
                <span className="num">{f.time(h)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="field">
        <h3 className="field-label">
          {t('booking.include')} <span className="field-count num">{t('booking.includeCount', { count: picked.length })}</span>
        </h3>
        <ul className="include-list">
          {routePlaces.map((p) => {
            const on = picked.includes(p.id);
            return (
              <li key={p.id}>
                <button className={`include${on ? ' is-on' : ''}`} role="checkbox" aria-checked={on} onClick={() => toggle(p.id)}>
                  <span className="include-icon"><CategoryIcon category={p.category} size={16} /></span>
                  <span className="include-name">{t(`places.${p.id}.name`)}</span>
                  <span className="include-box" aria-hidden>
                    {on && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}>
                        <Check size={14} strokeWidth={3.2} />
                      </motion.span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="booking-total">
        <div>
          <span className="total-label">{t('booking.total')}</span>
          <span className="total-detail num">{t('booking.totalDetail', { hours: t('booking.hoursShort', { count: hours }), rate: f.price(g.rate) })}</span>
        </div>
        <motion.span key={total} className="total-value num" initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}>
          {f.price(total)}
        </motion.span>
      </div>
      <button className="btn-primary" onClick={confirm} data-autofocus>
        {t('booking.confirm')}
      </button>
    </div>
  );
}

export function BookingSheet({ downtownId }: { downtownId: string | null }) {
  const guideId = useStore((s) => s.guideId);
  const rafeeqOpen = useStore((s) => s.rafeeqOpen);
  const openGuide = useStore((s) => s.openGuide);
  const g = GUIDES.find((x) => x.id === guideId);
  const open = rafeeqOpen && !!g && !!downtownId;
  return (
    <AnimatePresence>
      {open && g && downtownId && (
        <Sheet key={g.id} onClose={() => openGuide(null)} labelledBy="booking-title" className="booking-sheet">
          <BookingForm g={g} index={GUIDES.indexOf(g)} downtownId={downtownId} />
        </Sheet>
      )}
    </AnimatePresence>
  );
}
