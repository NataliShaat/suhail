import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { isAndroid, isStandalone, useDeviceFrame } from './frame';
import { Mark } from './Mark';
import { StarIcon } from './StarIcon';

const SHOW_MS = 1200;

/**
 * The launch screen, like a native app's: the logo with Suhail's star twinkling and the name in the
 * reading language, then a fade into the map (which has been drawing underneath). In an Android
 * browser it waits for a tap, which also takes the page full screen.
 */
export function Splash() {
  const { t } = useTranslation();
  const framed = useDeviceFrame((s) => s.framed);
  const [askTap] = useState(() => isAndroid() && !isStandalone() && !framed && !!document.documentElement.requestFullscreen);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => (askTap ? setReady(true) : setOpen(false)), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [askTap]);

  const start = () => {
    if (!askTap || !open) return;
    try {
      void document.documentElement.requestFullscreen({ navigationUI: 'hide' })?.catch(() => {});
    } catch {
      // No full screen here: carry on in the browser.
    }
    setOpen(false);
  };

  if (gone) return null;
  return (
    // Fading out, it lets taps through at once, even if a busy phone takes a while to finish the fade.
    <motion.div
      className={`splash${askTap ? ' is-tap' : ''}`}
      onPointerUp={start}
      initial={{ opacity: 1 }}
      animate={{ opacity: open ? 1 : 0, transition: { duration: 0.45, ease: 'easeOut' } }}
      onAnimationComplete={() => !open && setGone(true)}
      style={{ pointerEvents: open ? 'auto' : 'none' }}
      role="presentation"
    >
      <motion.div className="splash-mark" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
        <Mark size={104} />
        <span className="splash-star" aria-hidden>
          <StarIcon size={26} />
        </span>
      </motion.div>
      <motion.p className="splash-name" initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.45 }}>
        {t('app.name')}
      </motion.p>
      {askTap && ready && (
        <motion.button className="splash-tap" onClick={start} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
          {t('splash.tapToStart')}
        </motion.button>
      )}
    </motion.div>
  );
}
