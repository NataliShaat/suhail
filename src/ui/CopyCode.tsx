import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older WebViews and non-secure origins: fall back to a hidden textarea.
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand('copy');
      el.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** A dashed ticket holding a code, with a copy button that turns into "Copied". */
export function CopyCode({ code, label, tone = 'sand' }: { code: string; label: string; tone?: 'sand' | 'night' }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <div className={`ticket is-${tone}`}>
      <div className="ticket-text">
        <span className="ticket-label">{label}</span>
        {/* Codes are Latin: keep them LTR inside Arabic text. */}
        <code className="ticket-code" dir="ltr">{code}</code>
      </div>
      <button className={`ticket-copy${copied ? ' is-copied' : ''}`} onClick={async () => setCopied(await copyText(code))} aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={copied ? 'copied' : 'copy'}
            className="ticket-copy-inner"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            {copied ? <Check size={16} strokeWidth={2.8} aria-hidden /> : <Copy size={16} strokeWidth={2.2} aria-hidden />}
            {copied ? t('voucher.copied') : t('voucher.copy')}
          </motion.span>
        </AnimatePresence>
      </button>
    </div>
  );
}
