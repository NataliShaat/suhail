import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { UserRound } from 'lucide-react';
import { useStore } from '../store';
import { StarIcon } from '../ui/StarIcon';

/**
 * The bottom bar, on the city overview and inside every downtown: "Book a guide", and Suhail's star
 * beside it (on its right; on its left in Arabic). The guide button morphs into the Rafeeq screen
 * (shared layout id); both step aside while a hotel sheet or the chat is open, or the camera is flying.
 */
export function GuideFab() {
  const { t } = useTranslation();
  const view = useStore((s) => s.view);
  const previewId = useStore((s) => s.previewId);
  const rafeeqOpen = useStore((s) => s.rafeeqOpen);
  const suhailOpen = useStore((s) => s.suhailOpen);
  const openRafeeq = useStore((s) => s.openRafeeq);
  const openSuhail = useStore((s) => s.openSuhail);
  const show = !rafeeqOpen && !suhailOpen && ((view === 'city' && !previewId) || view === 'downtown');
  const delay = view === 'downtown' ? 0.35 : 0.1;
  return (
    <div className="fab-dock">
      {/* When it opens Rafeeq, the button morphs instead of sliding away. */}
      <AnimatePresence custom={rafeeqOpen}>
        {show && (
          <motion.button
            key="fab"
            layoutId="rafeeq-surface"
            className="fab"
            onClick={() => openRafeeq(true)}
            style={{ borderRadius: 999 }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0, transition: { delay, type: 'spring', stiffness: 300, damping: 26 } }}
            variants={{ gone: (opening: boolean) => (opening ? { opacity: 1 } : { opacity: 0, y: 40, transition: { duration: 0.2 } }) }}
            exit="gone"
            whileTap={{ scale: 0.96 }}
          >
            <span className="fab-icon">
              <UserRound size={20} strokeWidth={2.2} aria-hidden />
            </span>
            <span>{t('map.bookGuide')}</span>
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {show && (
          <motion.button
            key="star"
            className="star-fab"
            onClick={() => openSuhail(true)}
            aria-label={t('suhail.open')}
            initial={{ opacity: 0, y: 40, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { delay: delay + 0.08, type: 'spring', stiffness: 320, damping: 22 } }}
            exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.18 } }}
            whileTap={{ scale: 0.9 }}
          >
            <span className="star-fab-glow" aria-hidden />
            <StarIcon size={28} className="star-fab-icon" />
            <StarIcon size={9} className="star-fab-spark" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
