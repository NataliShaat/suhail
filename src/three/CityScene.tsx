import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { htmlPortal } from './htmlPortal';
import { Html } from '@react-three/drei';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { DirectionalLight, Group, Spherical, Vector3 } from 'three';
import { COLORS, FLY_DURATION, MIRROR_MAP_IN_RTL, THEMES } from '../config';
import { DOWNTOWNS, getDowntown, type Downtown } from '../data';
import { CITY_ISLAND_RADIUS, CITY_POSITIONS, HOTEL_SCALE, downtownLayout, type MapLayout } from '../data/geo';
import { useStore } from '../store';
import { Island, ISLAND_TOP } from './Island';
import { HotelIslandContents, ISLAND_COLORS } from './hotels';
import { DowntownLayer } from './DowntownLayer';
import { Sea } from './Sea';
import { CAMERA_FOV, fitCamera, textWidth, type FitPoint } from './fit';
import { frameDowntown, type Framing } from './frameDowntown';
import { clamp01, easeInOutCubic, flight } from './sceneState';

const HOTEL_HEIGHT = { ramada: 3.25, babsamhan: 1.1, comfort: 3.15 } as const;
const SINK = -2.2;

function cityOrigin(id: string) {
  const [x, z] = CITY_POSITIONS[id];
  return new Vector3(x, 0, z);
}

/* ---------- Camera: fits the city or a downtown, flies between them ---------- */

const LABEL_FONT: Record<string, string> = {
  ar: "700 13px 'IBM Plex Sans Arabic', sans-serif",
  'zh-CN': "700 13px 'Noto Sans SC', sans-serif",
  en: "700 12px Montserrat, sans-serif",
};

// Screen space taken by the chrome over the map, as fractions of the screen height.
const CITY_SAFE = { top: 0.28, bottom: 0.12, side: 0.03 };

/** Height of the downtown header under the language bar (title row, progress, filter chips), in CSS pixels. */
const HEADER_BELOW_BAR = 162;
/** Top of the guide button, measured from the bottom of the screen (see .fab-dock). */
const FAB_FROM_BOTTOM = 28 + 56;

/** Bottom of the downtown header. The language bar moves with the notch and safe area, so measure it. */
function headerBottom(lang: string) {
  const bar = document.querySelector<HTMLElement>('.lang-bar');
  const barBottom = bar ? bar.offsetTop + bar.offsetHeight : 88;
  // Arabic and Chinese set the title with more leading.
  return barBottom + HEADER_BELOW_BAR + (lang === 'en' ? 0 : 8);
}

// Composing a downtown takes a moment, so each one is kept per screen size and language.
const framings = new Map<string, Framing>();

/** The downtown view for this screen and language: camera, and where every island goes. */
function framingFor(downtown: Downtown, lang: string, t: TFunction, size: { width: number; height: number }): Framing {
  const top = headerBottom(lang);
  const key = `${downtown.id}|${lang}|${size.width}x${size.height}|${top}`;
  let framing = framings.get(key);
  if (!framing) {
    const base = downtownLayout(downtown, MIRROR_MAP_IN_RTL && lang === 'ar');
    const font = LABEL_FONT[lang] ?? LABEL_FONT.en;
    const lineH = lang === 'en' ? 15 : 19;
    // Matches .metro-chip: a 32px icon over the name and the line, each wrapping at 112px.
    const chip = (a: string, b: string) => {
      const wa = textWidth(a, font);
      const wb = textWidth(b, font);
      const lines = Math.ceil(wa / 112) + Math.ceil(wb / 112);
      return { w: Math.min(Math.max(wa, wb), 112) + 30, h: 6 + 32 + 4 + lineH * lines + 16 };
    };
    const labelSize = (id: string, kind: 'place' | 'metro' | 'zone') => {
      if (kind === 'zone') return { w: textWidth(t('places.jax.name'), font) + 44, h: 30 };
      if (id === 'no-metro') return chip(t('map.noMetroTitle'), t('map.noMetroRide'));
      if (kind === 'metro') return chip(t(`places.${id}.name`), t('metro.blue'));
      return { w: 52, h: 52 };
    };
    framing = frameDowntown(
      downtown,
      base,
      cityOrigin(downtown.id),
      { width: size.width, height: size.height },
      { headerBottom: top, buttonTop: size.height - FAB_FROM_BOTTOM },
      labelSize,
      downtown.bonus ? 'jax-zone' : null,
    );
    framings.set(key, framing);
  }
  return framing;
}

function useDowntownFraming(downtown: Downtown | undefined): Framing | null {
  const { size } = useThree();
  const { t } = useTranslation();
  const lang = useStore((s) => s.lang);
  const width = size.width;
  const height = size.height;
  return useMemo(() => (downtown ? framingFor(downtown, lang, t, { width, height }) : null), [downtown, width, height, lang, t]);
}

/** While a hotel's sheet is open, compose its downtown in the background so the fly-in starts at once. */
function usePrewarmFraming() {
  const { size } = useThree();
  const { t } = useTranslation();
  const lang = useStore((s) => s.lang);
  const previewId = useStore((s) => s.previewId);
  const width = size.width;
  const height = size.height;
  useEffect(() => {
    const d = getDowntown(previewId);
    if (!d) return;
    // After the camera has leaned in and the sheet has settled.
    const timer = window.setTimeout(() => framingFor(d, lang, t, { width, height }), 900);
    return () => window.clearTimeout(timer);
  }, [previewId, lang, t, width, height]);
}

function CameraRig({ layout, downFit }: { layout: MapLayout | null; downFit: Framing | null }) {
  const { camera, size, clock } = useThree();
  const view = useStore((s) => s.view);
  const arrive = useStore((s) => s.arrive);
  const backToCity = useStore((s) => s.backToCity);
  const viewSize = useMemo(() => ({ width: size.width, height: size.height }), [size.width, size.height]);
  const target = useRef(new Vector3());
  const tween = useRef<{ fromP: Vector3; fromT: Vector3; start: number; dur: number; dir: 1 | -1 } | null>(null);

  const cityFit = useMemo(() => {
    const pts: FitPoint[] = [];
    for (const d of DOWNTOWNS) {
      const o = cityOrigin(d.id);
      const r = CITY_ISLAND_RADIUS * 1.12;
      pts.push({ p: o.clone().add(new Vector3(r, 0, 0)) }, { p: o.clone().add(new Vector3(-r, 0, 0)) });
      pts.push({ p: o.clone().add(new Vector3(0, 0, -r)) }, { p: o.clone().add(new Vector3(0, HOTEL_HEIGHT[d.hotel.kind], 0)) });
      // The label under each island is wider than the island; keep all of it on screen.
      pts.push({ p: o.clone().add(new Vector3(0, ISLAND_TOP - 0.1, CITY_ISLAND_RADIUS + 0.5)), halfW: 108, halfH: 26 });
    }
    return fitCamera(pts, viewSize, 0.9, CITY_SAFE);
  }, [viewSize]);

  // With a hotel's sheet open, the camera leans in so that island sits above the sheet.
  const previewId = useStore((s) => s.previewId);
  const previewFit = useMemo(() => {
    if (!previewId) return null;
    const d = getDowntown(previewId);
    if (!d) return null;
    const o = cityOrigin(previewId);
    const r = CITY_ISLAND_RADIUS * 1.25;
    const pts = [
      o.clone().add(new Vector3(r, 0, 0)), o.clone().add(new Vector3(-r, 0, 0)),
      o.clone().add(new Vector3(0, 0, r)), o.clone().add(new Vector3(0, 0, -r)),
      o.clone().add(new Vector3(0, HOTEL_HEIGHT[d.hotel.kind], 0)),
    ];
    return fitCamera(pts, viewSize, 0.86, { top: 0.2, bottom: 0.4, side: 0.1 });
  }, [previewId, viewSize]);

  // First frame: jump straight to the right place (deep links land inside a downtown).
  const booted = useRef(false);
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    const fit = view === 'downtown' && downFit ? downFit : cityFit;
    camera.position.copy(fit.position);
    target.current.copy(fit.target);
    camera.lookAt(target.current);
    if (view === 'downtown') {
      flight.t = 1;
      flight.arrivedAt = 0;
      flight.enteredAt = -100;
    }
  }, [camera, cityFit, downFit, view]);

  useEffect(() => {
    if (view === 'flyingIn' || view === 'flyingOut') {
      const now = clock.elapsedTime;
      tween.current = {
        fromP: camera.position.clone(),
        fromT: target.current.clone(),
        start: now,
        dur: flight.reducedMotion ? 0.35 : FLY_DURATION,
        dir: view === 'flyingIn' ? 1 : -1,
      };
      flight.arrivedAt = -1;
      if (view === 'flyingIn') flight.enteredAt = now;
    }
  }, [view, camera, clock]);

  // A language switch can mirror the map: replay the route drawing quickly.
  const firstLayout = useRef(layout);
  useEffect(() => {
    if (firstLayout.current === layout) return;
    firstLayout.current = layout;
    if (view === 'downtown') flight.enteredAt = clock.elapsedTime - FLY_DURATION * 0.85;
  }, [layout, view, clock]);

  const sFrom = useMemo(() => new Spherical(), []);
  const sTo = useMemo(() => new Spherical(), []);
  const tmp = useMemo(() => new Vector3(), []);

  useFrame((state, dt) => {
    const now = state.clock.elapsedTime;
    const tw = tween.current;
    if (tw) {
      const dest = tw.dir === 1 ? downFit : cityFit;
      if (!dest) return;
      const raw = clamp01((now - tw.start) / tw.dur);
      const e = easeInOutCubic(raw);
      target.current.lerpVectors(tw.fromT, dest.target, e);
      // Orbit rather than slide: distance, pitch and heading interpolate around the moving target,
      // with a sweep to the side that turns back so the flight ends facing the hotel's front.
      sFrom.setFromVector3(tmp.copy(tw.fromP).sub(tw.fromT));
      sTo.setFromVector3(tmp.copy(dest.position).sub(dest.target));
      const arc = flight.reducedMotion ? 0 : Math.sin(Math.PI * e);
      const radius = sFrom.radius + (sTo.radius - sFrom.radius) * e + arc * 2;
      const phi = sFrom.phi + (sTo.phi - sFrom.phi) * e;
      const theta = sFrom.theta + (sTo.theta - sFrom.theta) * e + arc * 0.5 * tw.dir;
      camera.position.copy(target.current).add(tmp.setFromSphericalCoords(radius, phi, theta));
      flight.t = tw.dir === 1 ? e : 1 - e;
      if (raw >= 1) {
        tween.current = null;
        if (tw.dir === 1) {
          flight.t = 1;
          flight.arrivedAt = now;
          arrive();
        } else {
          flight.t = 0;
          flight.enteredAt = -1;
          backToCity();
        }
      }
    } else {
      const dest = view === 'downtown' && downFit ? downFit : view === 'city' && previewFit ? previewFit : cityFit;
      const k = 1 - Math.exp(-dt * (previewFit ? 3.5 : 3));
      // Inside a downtown the frame is composed to the pixel, so the drift there is barely a breath.
      const drift = flight.reducedMotion ? 0 : view === 'downtown' ? 0.03 : previewFit ? 0.15 : 0.45;
      const dx = Math.sin(now * 0.11) * drift;
      const dz = Math.cos(now * 0.083) * drift * 0.6;
      camera.position.x += (dest.position.x + dx - camera.position.x) * k;
      camera.position.y += (dest.position.y - camera.position.y) * k;
      camera.position.z += (dest.position.z + dz - camera.position.z) * k;
      target.current.lerp(dest.target, k);
    }
    camera.lookAt(target.current);
    camera.userData.target = target.current;
    if (import.meta.env.DEV) (window as unknown as { __rig: unknown }).__rig = { fps: 1 / dt, view };
  });

  return null;
}

/* ---------- Moonlight that follows the camera's focus so shadows stay crisp ---------- */

function Lights() {
  const light = useRef<DirectionalLight>(null);
  const { camera } = useThree();
  useFrame(() => {
    const t = camera.userData.target as Vector3 | undefined;
    if (!light.current || !t) return;
    light.current.position.set(t.x - 5, 11, t.z + 4);
    light.current.target.position.copy(t);
    light.current.target.updateMatrixWorld();
  });
  return (
    <>
      <hemisphereLight args={['#A9A3F0', '#2A1E2E', 0.75]} />
      <ambientLight color="#FFD9A8" intensity={0.45} />
      <directionalLight
        ref={light}
        color="#FFE6C4"
        intensity={2.1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0008}
        shadow-normalBias={0.02}
      />
    </>
  );
}

/* ---------- The three hotel islands ---------- */

// Rendered by drei's Html in its own React root, so no R3F hooks here; the island fades it.
function CityLabel({ d, onOpen, labelRef }: { d: Downtown; onOpen: () => void; labelRef: React.Ref<HTMLButtonElement> }) {
  const { t, i18n } = useTranslation();
  const visited = useStore((s) => s.visited);
  const total = d.places.length;
  const done = d.places.filter((p) => visited[p.id]).length;
  return (
    <button ref={labelRef} dir={i18n.dir()} className="city-label" onClick={onOpen} style={{ ['--dot' as string]: THEMES[d.theme].light }} aria-label={t('city.openHotel', { name: t(`downtowns.${d.id}.hotel`) })}>
      <span className="city-label-dot" aria-hidden />
      <span className="city-label-text">
        <span className="city-label-name">{t(`downtowns.${d.id}.name`)}</span>
        <span className="city-label-hotel">
          {t(`downtowns.${d.id}.hotelShort`)}
          {done > 0 && <span className="city-label-progress num"> · {done}/{total}</span>}
        </span>
      </span>
    </button>
  );
}

function CityIsland({ d }: { d: Downtown }) {
  const g = useRef<Group>(null);
  const preview = useStore((s) => s.preview);
  const view = useStore((s) => s.view);
  const chosen = useStore((s) => s.downtownId) === d.id;
  const previewId = useStore((s) => s.previewId);
  const o = cityOrigin(d.id);
  const colors = ISLAND_COLORS[d.hotel.kind];
  const lift = useRef(0);
  const label = useRef<HTMLButtonElement>(null);

  useFrame((state, dt) => {
    if (!g.current) return;
    // The others sink under the city as the camera leaves; the chosen one stays.
    const sink = chosen ? 0 : clamp01(flight.t * 1.6);
    const s = sink < 1 ? sink * sink : 1;
    const want = previewId === d.id && view === 'city' ? 0.18 : 0;
    lift.current += (want - lift.current) * Math.min(1, dt * 6);
    const bob = flight.reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.7 + o.x) * 0.03;
    g.current.position.set(o.x, SINK * s + lift.current + bob * (1 - flight.t), o.z);
    // The chosen hotel grows into the hero of its downtown as the camera arrives.
    g.current.scale.setScalar(chosen ? 1 + (HOTEL_SCALE - 1) * flight.t : 1);
    g.current.visible = s < 0.995;
    const el = label.current;
    if (el) {
      const other = previewId !== null && previewId !== d.id;
      const op = (1 - clamp01(flight.t * 3)) * (other ? 0 : 1);
      el.style.opacity = String(op);
      el.style.transform = `translateY(${(1 - op) * 10}px)`;
      el.style.visibility = op < 0.02 ? 'hidden' : 'visible';
    }
  });

  const open = () => {
    if (useStore.getState().view === 'city') preview(d.id);
  };

  return (
    <group ref={g} position={o}>
      <Island radius={CITY_ISLAND_RADIUS} seed={d.id} glow={THEMES[d.theme].light} top={colors.top} side={colors.side} onClick={open}>
        <group onClick={(e) => { e.stopPropagation(); open(); }}>
          <HotelIslandContents kind={d.hotel.kind} model={d.hotel.model} />
        </group>
      </Island>
      <Html portal={htmlPortal} position={[0, ISLAND_TOP - 0.1, CITY_ISLAND_RADIUS + 0.5]} center zIndexRange={[20, 10]}>
        <CityLabel d={d} onOpen={open} labelRef={label} />
      </Html>
    </group>
  );
}

function Scene() {
  const downtownId = useStore((s) => s.downtownId);
  const downtown = getDowntown(downtownId);
  const framing = useDowntownFraming(downtown);
  usePrewarmFraming();
  const layout = framing?.layout ?? null;
  const origin = useMemo(() => (downtown ? cityOrigin(downtown.id) : new Vector3()), [downtown]);
  return (
    <>
      <color attach="background" args={[COLORS.nightDeep]} />
      <fog attach="fog" args={[COLORS.nightDeep, 34, 90]} />
      <Lights />
      <Sea />
      {DOWNTOWNS.map((d) => (
        <CityIsland key={d.id} d={d} />
      ))}
      {downtown && layout && <DowntownLayer downtown={downtown} origin={origin} layout={layout} />}
      <CameraRig layout={layout} downFit={framing} />
    </>
  );
}

export function CityScene() {
  return (
    <Canvas
      className="canvas"
      dpr={[1, 1.75]}
      shadows="percentage"
      camera={{ fov: CAMERA_FOV, near: 1, far: 160, position: [0, 30, 26] }}
      flat
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      resize={{ offsetSize: true }}
      onPointerMissed={() => {
        const s = useStore.getState();
        if (s.view === 'city' && s.previewId) s.preview(null);
      }}
    >
      <Scene />
    </Canvas>
  );
}

