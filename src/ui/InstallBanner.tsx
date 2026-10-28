import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Download, Share, X } from 'lucide-react';
import { useStore } from '../store';
import { isIos, isStandalone, useDeviceFrame } from './frame';
import { Mark } from './Mark';

const KEY = 'suhail-install-banner';
const DELAY_MS = 20_000;

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Chrome fires this once, early: keep it for when the banner shows.
let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallPromptEvent;
  listeners.forEach((cb) => cb());
});
window.addEventListener('appinstalled', () => remember());

function done() {
  try {
    return localStorage.getItem(KEY) === 'done';
  } catch {
    return false;
  }
}
function remember() {
  try {
    localStorage.setItem(KEY, 'done');
  } catch {
    // Storage blocked: the banner may come back next visit.
  }
}

/**
 * After a little while on a real phone, a small banner offers to install the app: one tap on
 * Android, the Share → Add to Home Screen steps on iPhone. Once dismissed or installed it never
 * returns, and an app opened from the home screen never sees it.
 */
export function InstallBanner() {
  const { t } = useTranslation();
  const framed = useDeviceFrame((s) => s.framed);
  const busy = useStore((s) => s.rafeeqOpen || s.suhailOpen || s.settingsOpen || !!s.placeId || !!s.previewId || s.view === 'flyingIn' || s.view === 'flyingOut');
  const [due, setDue] = useState(false);
  const [canPrompt, setCanPrompt] = useState(!!deferred);
  const [closed, setClosed] = useState(false);
  const eligible = !framed && !isStandalone() && !done();

  useEffect(() => {
    if (!eligible) return;
    const onPrompt = () => setCanPrompt(true);
    listeners.add(onPrompt);
    const timer = window.setTimeout(() => setDue(true), DELAY_MS);
    return () => {
      listeners.delete(onPrompt);
      window.clearTimeout(timer);
    };
  }, [eligible]);

  const ios = isIos();
  const show = eligible && due && !closed && !busy && (canPrompt || ios);

  const dismiss = () => {
    remember();
    setClosed(true);
  };
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === 'accepted') dismiss();
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="install-banner"
          role="dialog"
          aria-label={t('install.title')}
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 320, damping: 28 } }}
          exit={{ y: 24, opacity: 0, transition: { duration: 0.2 } }}
        >
          <span className="install-icon">
            <Mark size={30} />
          </span>
          {canPrompt ? (
            <button className="install-action" onClick={() => void install()}>
              <Download size={16} strokeWidth={2.4} aria-hidden />
              {t('install.android')}
            </button>
          ) : (
            <p className="install-ios">
              <Share size={16} strokeWidth={2.2} className="install-share" aria-hidden />
              {t('install.ios')}
            </p>
          )}
          <button className="install-close" onClick={dismiss} aria-label={t('install.dismiss')}>
            <X size={18} strokeWidth={2.4} aria-hidden />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
