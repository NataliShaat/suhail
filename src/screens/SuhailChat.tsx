import { Fragment, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowUp, RotateCcw, SquarePen, UserRound, X } from 'lucide-react';
import { allPlaces, getDowntown } from '../data';
import { useStore } from '../store';
import { useChat, type ChatMessage } from '../assistant/chat';
import { Sheet } from '../ui/Sheet';
import { StarIcon } from '../ui/StarIcon';

const ease = [0.22, 1, 0.36, 1] as const;

/** The downtown on screen, if any: suggestions and the greeting follow it. */
function useHere() {
  const view = useStore((s) => s.view);
  const downtownId = useStore((s) => s.downtownId);
  return view === 'downtown' ? getDowntown(downtownId) : undefined;
}

function useSuggestions() {
  const { t } = useTranslation();
  const d = useHere();
  const keys = d
    ? ['openNow', 'dinner', allPlaces(d).some((p) => p.category === 'heritage') ? 'heritage' : 'landmarks', 'next']
    : ['whichDowntown', 'oneEvening', 'metro'];
  return keys.map((k) => t(`suhail.suggest.${k}`));
}

/** Replies are plain text; **bold** marks a place name. */
function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : <Fragment key={i}>{part}</Fragment>))}
    </>
  );
}

function Notice({ m }: { m: ChatMessage }) {
  const { t } = useTranslation();
  const retry = useChat((s) => s.retry);
  const openRafeeq = useStore((s) => s.openRafeeq);
  if (m.notice === 'offline') {
    return (
      <div className="msg is-bot is-notice" role="status">
        <p className="notice-title">{t('suhail.offlineTitle')}</p>
        <p>{t('suhail.offlineText')}</p>
        <button className="notice-action" onClick={() => openRafeeq(true)}>
          <UserRound size={16} strokeWidth={2.2} aria-hidden />
          {t('map.bookGuide')}
        </button>
      </div>
    );
  }
  return (
    <div className="msg is-bot is-notice" role="status">
      <p>{t(`suhail.${m.notice}`)}</p>
      {m.notice !== 'refusal' && (
        <button className="notice-action" onClick={retry}>
          <RotateCcw size={16} strokeWidth={2.2} aria-hidden />
          {t('suhail.retry')}
        </button>
      )}
    </div>
  );
}

function Message({ m }: { m: ChatMessage }) {
  // An empty reply is still on its way: the typing dots stand in for it.
  if (m.role === 'assistant' && !m.notice && !m.text) return null;
  return (
    <motion.div
      className={`msg-row ${m.role === 'user' ? 'is-user' : 'is-bot'}`}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease }}
    >
      {m.role === 'assistant' && (
        <span className="msg-avatar" aria-hidden>
          <StarIcon size={14} />
        </span>
      )}
      {m.notice ? (
        <Notice m={m} />
      ) : (
        <div className={`msg ${m.role === 'user' ? 'is-user' : 'is-bot'}`} dir="auto">
          <RichText text={m.text} />
        </div>
      )}
    </motion.div>
  );
}

function Typing() {
  const { t } = useTranslation();
  return (
    <motion.div className="msg-row is-bot" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
      <span className="msg-avatar" aria-hidden>
        <StarIcon size={14} />
      </span>
      <div className="msg is-bot typing" role="status" aria-label={t('suhail.typing')}>
        <span />
        <span />
        <span />
      </div>
    </motion.div>
  );
}

function Welcome() {
  const { t } = useTranslation();
  const d = useHere();
  const send = useChat((s) => s.send);
  const suggestions = useSuggestions();
  return (
    <div className="suhail-welcome">
      <span className="suhail-welcome-star" aria-hidden>
        <StarIcon size={34} />
      </span>
      <h3>{t('suhail.welcomeTitle')}</h3>
      <p>{d ? t('suhail.welcomeDowntown', { name: t(`downtowns.${d.id}.name`) }) : t('suhail.welcomeCity')}</p>
      <div className="suggestions">
        {suggestions.map((s, i) => (
          <motion.button
            key={s}
            className="suggest"
            onClick={() => send(s)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.12 + i * 0.05, duration: 0.35, ease } }}
            whileTap={{ scale: 0.97 }}
          >
            {s}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ChatSheet({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const messages = useChat((s) => s.messages);
  const waiting = useChat((s) => s.waiting);
  const busy = useChat((s) => s.busy);
  const send = useChat((s) => s.send);
  const reset = useChat((s) => s.reset);
  const [draft, setDraft] = useState('');
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Keep the newest words in view as they stream in.
  useEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, waiting]);

  // With a mouse and keyboard, type straight away; on a phone, wait for a tap so the keyboard
  // doesn't cover the suggestions.
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) input.current?.focus({ preventScroll: true });
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || busy) return;
    send(draft);
    setDraft('');
  };

  return (
    <Sheet onClose={onClose} labelledBy="suhail-title" className="suhail-sheet">
      <header className="suhail-head">
        <span className="suhail-avatar" aria-hidden>
          <StarIcon size={22} />
        </span>
        <div className="suhail-title">
          <h2 id="suhail-title">{t('app.name')}</h2>
          <p>{t('suhail.tagline')}</p>
        </div>
        {messages.length > 0 && (
          <button className="icon-btn suhail-icon" onClick={reset} aria-label={t('suhail.newChat')}>
            <SquarePen size={18} strokeWidth={2} aria-hidden />
          </button>
        )}
        <button className="icon-btn suhail-icon" onClick={onClose} aria-label={t('common.close')}>
          <X size={20} strokeWidth={2.2} aria-hidden />
        </button>
      </header>
      <div className="suhail-log" ref={log} role="log" aria-live="polite" aria-label={t('app.name')}>
        {messages.length === 0 ? <Welcome /> : messages.map((m) => <Message key={m.id} m={m} />)}
        <AnimatePresence>{waiting && <Typing key="typing" />}</AnimatePresence>
      </div>
      <form className="suhail-compose" onSubmit={submit}>
        <input
          ref={input}
          className="suhail-input"
          dir="auto"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('suhail.placeholder')}
          aria-label={t('suhail.placeholder')}
          enterKeyHint="send"
          autoComplete="off"
          maxLength={500}
        />
        <button type="submit" className="suhail-send" disabled={!draft.trim() || busy} aria-label={t('suhail.send')}>
          <ArrowUp size={20} strokeWidth={2.4} aria-hidden />
        </button>
      </form>
    </Sheet>
  );
}

/** Suhail, the star assistant: a chat that slides up from the star button. */
export function SuhailChat() {
  const open = useStore((s) => s.suhailOpen);
  const openSuhail = useStore((s) => s.openSuhail);
  return <AnimatePresence>{open && <ChatSheet key="suhail" onClose={() => openSuhail(false)} />}</AnimatePresence>;
}
