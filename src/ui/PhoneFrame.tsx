import { useEffect, useState, type ReactNode } from 'react';

/** On a laptop the app sits in a phone frame, scaled to fit the window. On a phone it fills the screen. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerHeight - 32) / 844, (window.innerWidth - 32) / 390));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return (
    <div className="stage">
      <div className="device" style={{ ['--device-scale' as string]: scale }}>
        <div className="notch" aria-hidden />
        <div className="screen">{children}</div>
      </div>
    </div>
  );
}
