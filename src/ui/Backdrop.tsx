import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import qrcode from 'qrcode-generator';
import { Mark } from './Mark';
import { StarIcon } from './StarIcon';

/**
 * Where the QR code points. Set VITE_PUBLIC_URL at build time to the deployed site; without it, the
 * code points at the page that is open (right when presenting from the live site).
 */
const PUBLIC_URL: string = import.meta.env.VITE_PUBLIC_URL || `${location.origin}${location.pathname}`;

/** Sparkles in the night behind the phone: left %, top %, size px, twinkle period s, delay s. */
const STARS = [
  [6, 12, 10, 4.2, 0.3], [14, 78, 7, 3.6, 1.8], [22, 30, 6, 4.8, 2.6], [9, 52, 8, 3.9, 1.1],
  [30, 88, 9, 4.4, 0.7], [33, 8, 7, 3.4, 2.2], [68, 10, 8, 4.1, 1.4], [72, 84, 7, 3.7, 0.2],
  [80, 26, 10, 4.6, 2.9], [90, 60, 7, 3.5, 1.6], [94, 14, 6, 4.9, 0.9], [86, 90, 9, 4.0, 2.4],
] as const;

function QrCode({ text }: { text: string }) {
  const path = useMemo(() => {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`;
    return { d, n };
  }, [text]);
  return (
    <svg className="qr" viewBox={`-2 -2 ${path.n + 4} ${path.n + 4}`} shapeRendering="crispEdges" role="img" aria-label={text}>
      <rect x="-2" y="-2" width={path.n + 4} height={path.n + 4} rx="2" fill="#FFFFFF" />
      <path d={path.d} fill="#1C1A3A" />
    </svg>
  );
}

/** Behind the desktop phone frame: the night sky, the brand on one side and a QR code on the other. */
export function Backdrop() {
  const { t, i18n } = useTranslation();
  return (
    <div className="backdrop" dir={i18n.dir()}>
      <div className="backdrop-stars" aria-hidden>
        {STARS.map(([x, y, size, duration, delay], i) => (
          <span key={i} className="header-star" style={{ left: `${x}%`, top: `${y}%`, animationDuration: `${duration}s`, animationDelay: `${delay}s` }}>
            <StarIcon size={size} />
          </span>
        ))}
      </div>
      <div className="backdrop-side backdrop-brand">
        <Mark size={96} />
        <p className="backdrop-name">{t('app.name')}</p>
        <p className="backdrop-tagline">{t('suhail.tagline')}</p>
      </div>
      <div className="backdrop-side backdrop-qr">
        <QrCode text={PUBLIC_URL} />
        <p className="backdrop-scan">{t('frame.scan')}</p>
      </div>
    </div>
  );
}
