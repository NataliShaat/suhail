import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { COLORS, THEMES } from '../config';
import { getDowntown, type Downtown } from '../data';
import { useStore } from '../store';
import { CopyCode } from '../ui/CopyCode';
import { StarIcon } from '../ui/StarIcon';

const ease = [0.22, 1, 0.36, 1] as const;

function burst(canvas: HTMLCanvasElement, d: Downtown) {
  const theme = THEMES[d.theme];
  const colors = [COLORS.gold, '#FBE3A6', COLORS.sand, theme.light, theme.dark, COLORS.completed];
  // disableForReducedMotion: nothing is drawn when the user asks for less motion.
  const fire = confetti.create(canvas, { resize: true, useWorker: true, disableForReducedMotion: true });
  const base = { colors, ticks: 260, gravity: 0.9, scalar: 0.9 };
  fire({ ...base, particleCount: 90, spread: 80, startVelocity: 42, origin: { x: 0.5, y: 0.55 } });
  window.setTimeout(() => {
    fire({ ...base, particleCount: 55, angle: 60, spread: 60, startVelocity: 55, origin: { x: 0, y: 0.75 } });
    fire({ ...base, particleCount: 55, angle: 120, spread: 60, startVelocity: 55, origin: { x: 1, y: 0.75 } });
  }, 220);
  window.setTimeout(() => {
    fire({ ...base, particleCount: 40, spread: 120, startVelocity: 30, shapes: ['star'], scalar: 1.2, origin: { x: 0.5, y: 0.3 } });
  }, 520);
}

/** Fires once per downtown when its last main-route place is checked in: confetti, then the reward card. */
export function Celebration() {
  const view = useStore((s) => s.view);
  const downtownId = useStore((s) => s.downtownId);
  const visited = useStore((s) => s.visited);
  const completed = useStore((s) => s.completed);
  const canvas = useRef<HTMLCanvasElement>(null);

  const d = getDowntown(downtownId);
  const allDone = !!d && d.places.every((p) => visited[p.id]);
  const due = view === 'downtown' && !!d && allDone && !completed[d.id];

  useEffect(() => {
    if (!due || !d) return;
    const s = useStore.getState();
    if (s.completed[d.id]) return; // StrictMode runs effects twice in dev
    s.complete(d.id);
    if (canvas.current) burst(canvas.current, d);
    // The reward card follows once the first wave has popped; the place sheet makes way for it.
    window.setTimeout(() => {
      const now = useStore.getState();
      if (now.downtownId !== d.id || now.view !== 'downtown') return;
      useStore.setState({ placeId: null, rewardFor: d.id });
    }, 1000);
  }, [due, d]);

  return (
    <>
      <canvas ref={canvas} className="confetti-canvas" aria-hidden />
      <RewardModal />
    </>
  );
}

function RewardModal() {
  const { t } = useTranslation();
  const rewardFor = useStore((s) => s.rewardFor);
  const openReward = useStore((s) => s.openReward);
  const d = getDowntown(rewardFor);
  const close = () => openReward(null);
  const card = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!d) return;
    card.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && openReward(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [d, openReward]);

  const theme = d ? THEMES[d.theme] : THEMES.oldcity;

  return (
    <AnimatePresence>
      {d && (
        <motion.div
          key="reward"
          className="reward-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
          style={{ ['--district' as string]: theme.light, ['--district-dark' as string]: theme.dark }}
        >
          <div className="reward-scrim" onClick={close} aria-hidden />
          <motion.div
            ref={card}
            className="reward-card"
            role="dialog"
            aria-modal
            aria-labelledby="reward-title"
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.86, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 380, damping: 26 } }}
            exit={{ opacity: 0, scale: 0.94, y: 12, transition: { duration: 0.18 } }}
          >
            <button className="icon-btn on-sand reward-close" onClick={close} aria-label={t('common.close')}>
              <X size={20} strokeWidth={2.2} aria-hidden />
            </button>
            <div className="reward-hero" aria-hidden>
              <motion.span
                className="reward-hero-star"
                initial={{ scale: 0, rotate: -60 }}
                animate={{ scale: [0, 1.2, 1], rotate: [-60, 10, 0] }}
                transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
              >
                <StarIcon size={56} />
              </motion.span>
            </div>
            <h2 id="reward-title" className="reward-title">{t('reward.title')}</h2>
            <p className="reward-sub">{t('reward.subtitle', { name: t(`downtowns.${d.id}.name`) })}</p>

            <p className="reward-label">{t('reward.stars')}</p>
            <div className="reward-stars" aria-label={t('stars.label', { count: d.places.length, total: d.places.length })}>
              {d.places.map((p, i) => (
                <motion.span
                  key={p.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.35 + i * 0.07, ease: 'easeOut' }}
                >
                  <StarIcon size={24} />
                </motion.span>
              ))}
            </div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45, ease }}>
              <p className="reward-offer">{t('reward.offer', { percent: d.reward.percent, hotel: t(`downtowns.${d.id}.hotelShort`) })}</p>
              <CopyCode code={d.reward.code} label={t('reward.codeLabel')} />
              <button className="btn-primary reward-done" onClick={close}>
                {t('reward.done')}
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
