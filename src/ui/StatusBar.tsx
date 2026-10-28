import { useEffect, useState } from 'react';
import { useStore } from '../store';

/** "9:41", the way a phone's status bar shows it: 12-hour, no AM/PM. */
function clock(d: Date) {
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** The time, ticking over on the minute. */
function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer: number;
    const tick = () => {
      const d = new Date();
      setNow(d);
      timer = window.setTimeout(tick, 60_000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 20);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);
  return clock(now);
}

/**
 * The phone's status bar, drawn only inside the desktop phone frame: time on one side, signal,
 * Wi-Fi and battery on the other. It turns dark over the sand Rafeeq screen, like iOS does.
 */
export function StatusBar() {
  const time = useClock();
  const onSand = useStore((s) => s.rafeeqOpen);
  return (
    <div className={`status-bar${onSand ? ' is-dark' : ''}`} aria-hidden>
      <span className="status-time num">{time}</span>
      <span className="status-icons">
        <svg width="18" height="12" viewBox="0 0 18 12">
          <rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor" />
          <rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor" />
          <rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor" />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12">
          <path d="M8 2.2c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.8 10.8 0 0 0 8 .4C5.2.4 2.5 1.5.5 3.4l1.2 1.3A9 9 0 0 1 8 2.2Z" fill="currentColor" />
          <path d="M8 5.6c1.5 0 2.9.6 4 1.6l1.2-1.3A7.4 7.4 0 0 0 8 3.8c-2 0-3.8.8-5.2 2.1L4 7.2a5.7 5.7 0 0 1 4-1.6Z" fill="currentColor" />
          <path d="M8 9.1c.6 0 1.2.2 1.6.6L8 11.5 6.4 9.7c.4-.4 1-.6 1.6-.6Z" fill="currentColor" />
          <path d="M8 7.3c1.1 0 2 .4 2.8 1.1l-1.2 1.3A2.3 2.3 0 0 0 8 9.1c-.6 0-1.2.2-1.6.6L5.2 8.4A4 4 0 0 1 8 7.3Z" fill="currentColor" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" strokeOpacity="0.45" />
          <rect x="2" y="2" width="17" height="9" rx="2.4" className="status-battery" />
          <path d="M25 4.4v4.2c.8-.3 1.4-1.1 1.4-2.1S25.8 4.7 25 4.4Z" fill="currentColor" fillOpacity="0.5" />
        </svg>
      </span>
    </div>
  );
}
