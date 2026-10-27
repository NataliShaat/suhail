import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useEffect } from 'react';
import { ensureFont, LANG_SELF_NAME } from '../i18n';
import { useStore, type Lang } from '../store';
import { switchLanguage } from './switchLanguage';

const ORDER: Lang[] = ['en', 'ar', 'zh-CN'];

/** The language switcher, at the top of every screen. Each option is written in its own script. */
export function LangBar() {
  const { t } = useTranslation();
  const lang = useStore((s) => s.lang);
  // Every option shows its own script, so each script's font is needed from the start.
  useEffect(() => ORDER.forEach(ensureFont), []);
  return (
    <div className="lang-bar" role="radiogroup" aria-label={t('common.language')}>
      {ORDER.map((l) => {
        const on = lang === l;
        return (
          <button key={l} role="radio" aria-checked={on} lang={l} className={`lang-seg${on ? ' is-on' : ''}`} onClick={() => switchLanguage(l)}>
            {on && <motion.span layoutId="lang-bar-on" className="lang-seg-bg" transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
            <span className="lang-seg-text">{LANG_SELF_NAME[l]}</span>
          </button>
        );
      })}
    </div>
  );
}
