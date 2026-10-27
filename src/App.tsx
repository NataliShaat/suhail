import { useEffect } from 'react';
import { LayoutGroup, MotionConfig, useReducedMotion } from 'framer-motion';
import { CityScene } from './three/CityScene';
import { flight } from './three/sceneState';
import { setHtmlPortal } from './three/htmlPortal';
import { applyLanguage } from './i18n';
import { useStore } from './store';
import { PhoneFrame } from './ui/PhoneFrame';
import { CityOverview } from './screens/CityOverview';
import { DowntownMap } from './screens/DowntownMap';
import { PlaceSheet } from './screens/PlaceSheet';
import { RafeeqScreen } from './screens/Rafeeq';
import { SettingsSheet } from './screens/Settings';
import { LangBar } from './ui/LangBar';
import { GuideFab } from './screens/GuideFab';
import { SuhailChat } from './screens/SuhailChat';
import { getDowntown } from './data';
import { THEMES } from './config';

export function App() {
  const lang = useStore((s) => s.lang);
  const downtownId = useStore((s) => s.downtownId);
  const reduce = useReducedMotion();
  flight.reducedMotion = !!reduce;

  useEffect(() => {
    applyLanguage(lang);
  }, [lang]);

  const theme = THEMES[getDowntown(downtownId)?.theme ?? 'oldcity'];

  return (
    <MotionConfig reducedMotion="user">
      <PhoneFrame>
        <div className="app" style={{ ['--district' as string]: theme.light, ['--district-dark' as string]: theme.dark }}>
          <div className="canvas-layer">
            <CityScene />
            <div className="html-overlay" ref={setHtmlPortal} />
          </div>
          <LayoutGroup>
            <div className="ui-layer">
              <CityOverview />
              <DowntownMap />
              <GuideFab />
              <PlaceSheet />
              <RafeeqScreen />
              <SettingsSheet />
              <SuhailChat />
            </div>
          </LayoutGroup>
          {/* Outside the ui layer, so it stays put while the text around it crossfades. */}
          <LangBar />
        </div>
      </PhoneFrame>
    </MotionConfig>
  );
}
