import { useEffect, type ReactNode } from 'react';
import { Backdrop } from './Backdrop';
import { useDeviceFrame, wantsFrame, watchFrame } from './frame';
import { Splash } from './Splash';
import { StatusBar } from './StatusBar';

/** The phone's outer size: a 390 × 844 screen inside a 12px bezel. */
const DEVICE_W = 414;
const DEVICE_H = 868;
const MARGIN = 40;
const MAX_SCALE = 1.4;

/**
 * On a laptop or desktop the app sits in a phone frame (status bar, Dynamic Island, home indicator),
 * scaled to fit the window, over a night-sky backdrop. On a phone it fills the screen. Either way the
 * app only ever sees its `.screen`: every layer inside is positioned against it, not the window.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const framed = useDeviceFrame((s) => s.framed);
  const scale = useDeviceFrame((s) => s.scale);
  useEffect(() => {
    const fit = () => {
      const f = wantsFrame();
      const s = f ? Math.min(MAX_SCALE, (window.innerHeight - MARGIN * 2) / DEVICE_H, (window.innerWidth - MARGIN * 2) / DEVICE_W) : 1;
      useDeviceFrame.setState({ framed: f, scale: Math.max(0.3, s) });
    };
    fit();
    window.addEventListener('resize', fit);
    const unwatch = watchFrame(fit);
    return () => {
      window.removeEventListener('resize', fit);
      unwatch();
    };
  }, []);
  return (
    <div className={`stage${framed ? ' is-framed' : ''}`} style={framed ? { ['--device-scale' as string]: scale } : undefined}>
      {framed && <Backdrop />}
      <div className="device">
        {framed && (
          <>
            <span className="device-key is-action" aria-hidden />
            <span className="device-key is-volume-up" aria-hidden />
            <span className="device-key is-volume-down" aria-hidden />
            <span className="device-key is-power" aria-hidden />
          </>
        )}
        <div className="screen">
          {children}
          <Splash />
          {framed && (
            <>
              <StatusBar />
              <div className="island" aria-hidden />
              <div className="home-indicator" aria-hidden />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
