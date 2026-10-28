import { StarIcon } from './StarIcon';

/** Sparkles in the night behind the phone: left %, top %, size px, twinkle period s, delay s. */
const STARS = [
  [6, 12, 10, 4.2, 0.3], [14, 78, 7, 3.6, 1.8], [22, 30, 6, 4.8, 2.6], [9, 52, 8, 3.9, 1.1],
  [30, 88, 9, 4.4, 0.7], [33, 8, 7, 3.4, 2.2], [68, 10, 8, 4.1, 1.4], [72, 84, 7, 3.7, 0.2],
  [80, 26, 10, 4.6, 2.9], [90, 60, 7, 3.5, 1.6], [94, 14, 6, 4.9, 0.9], [86, 90, 9, 4.0, 2.4],
] as const;

/** Behind the desktop phone frame: the night sky with a few twinkling stars. */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="backdrop-stars">
        {STARS.map(([x, y, size, duration, delay], i) => (
          <span key={i} className="header-star" style={{ left: `${x}%`, top: `${y}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>
            <StarIcon size={size} />
          </span>
        ))}
      </div>
    </div>
  );
}
