import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import { DOWNTOWNS } from '../data';
import { LANGS } from '../i18n';
import { useStore } from '../store';
import { Mark } from '../ui/Mark';
import { Sheet } from '../ui/Sheet';
import { switchLanguage } from '../ui/switchLanguage';

export function LanguageChoice({ layoutPrefix }: { layoutPrefix: string }) {
  const lang = useStore((s) => s.lang);
  return (
    <div className="lang-choice" role="radiogroup">
      {LANGS.map((l) => {
        const on = lang === l.id;
        return (
          <button key={l.id} role="radio" aria-checked={on} lang={l.id} dir={l.id === 'ar' ? 'rtl' : 'ltr'} className={`lang-option${on ? ' is-on' : ''}`} onClick={() => switchLanguage(l.id)}>
            {on && <motion.span layoutId={`${layoutPrefix}-lang`} className="lang-option-bg" transition={{ type: 'spring', stiffness: 480, damping: 36 }} />}
            <span className="lang-option-text">{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function SettingsSheet() {
  const { t } = useTranslation();
  const open = useStore((s) => s.settingsOpen);
  const openSettings = useStore((s) => s.openSettings);
  const visited = useStore((s) => s.visited);
  const reset = useStore((s) => s.resetProgress);
  const [armed, setArmed] = useState(false);
  const [cleared, setCleared] = useState(false);
  useEffect(() => {
    if (!open) {
      setArmed(false);
      setCleared(false);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <Sheet onClose={() => openSettings(false)} labelledBy="settings-title" className="settings-sheet">
          <h2 id="settings-title" className="sheet-title">{t('settings.title')}</h2>
          <section className="field">
            <h3 className="field-label">{t('common.language')}</h3>
            <LanguageChoice layoutPrefix="settings" />
          </section>
          <section className="field">
            <h3 className="field-label">{t('settings.progress')}</h3>
            <ul className="settings-progress">
              {DOWNTOWNS.map((d) => {
                const done = d.places.filter((p) => visited[p.id]).length;
                return (
                  <li key={d.id}>
                    <span>{t(`downtowns.${d.id}.name`)}</span>
                    <span className="num">{done}/{d.places.length}</span>
                  </li>
                );
              })}
            </ul>
            <button
              className={`btn-danger${armed ? ' is-armed' : ''}`}
              onClick={() => {
                if (!armed) return setArmed(true);
                reset();
                setArmed(false);
                setCleared(true);
              }}
            >
              <RotateCcw size={16} strokeWidth={2.2} aria-hidden />
              {cleared ? t('settings.resetDone') : armed ? t('settings.resetConfirm') : t('settings.reset')}
            </button>
          </section>
          <p className="settings-foot">
            <Mark size={18} /> {t('app.name')}
          </p>
        </Sheet>
      )}
    </AnimatePresence>
  );
}
