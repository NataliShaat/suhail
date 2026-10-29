import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { htmlPortal } from './htmlPortal';
import { Html, Line } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Car, Check, Flag, Lock, Ticket, TramFront } from 'lucide-react';
import { Group, Mesh, MeshBasicMaterial, QuadraticBezierCurve3, Vector3 } from 'three';
import type { Line2 } from 'three-stdlib';
import { COLORS, FLY_DURATION, THEMES } from '../config';
import { allPlaces, isBonusUnlocked, type Downtown, type Place } from '../data';
import type { MapLayout } from '../data/geo';
import { HOME_RADIUS, HOTEL_SCALE, PLACE_RADIUS } from '../data/geo';
import { useStore } from '../store';
import { CategoryIcon } from '../ui/CategoryIcon';
import { EarnedStar } from '../ui/EarnedStar';
import { isRtl } from '../i18n';
import { Island, ISLAND_TOP } from './Island';
import { Bush, ContactAO, mats, Palm } from './props';
import { Faisaliah, Fort, KingdomCentre, MudHouse, Museum, TuraifRuins } from './hotels';
import { clamp01, easeOutBack, flight } from './sceneState';

const SINK = -1.6;

/** Fades and scales an Html overlay with the island under it, so nothing floats over empty sea. */
function syncOverlay(el: HTMLElement | null, k: number) {
  if (!el) return;
  const v = clamp01((k - 0.55) / 0.4);
  el.style.opacity = String(v);
  el.style.transform = `scale(${0.6 + 0.4 * Math.min(v, 1)})`;
  el.style.visibility = v < 0.02 ? 'hidden' : 'visible';
}

/* ---------- Small dioramas on each place island ---------- */

function FoodHall({ color }: { color: string }) {
  return (
    <group>
      <ContactAO size={[0.7, 0.6]} />
      <mesh material={mats.stone} position-y={0.11} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.22, 0.3]} />
      </mesh>
      <mesh position={[0, 0.2, 0.18]} rotation-x={0.5} castShadow>
        <boxGeometry args={[0.46, 0.012, 0.12]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh material={mats.lantern} position={[0, 0.08, 0.152]}>
        <boxGeometry args={[0.3, 0.08, 0.004]} />
      </mesh>
      <Palm position={[0.32, 0, -0.12]} scale={0.8} seed="fh" />
    </group>
  );
}

function CoffeeKiosk({ color }: { color: string }) {
  return (
    <group>
      <ContactAO size={[0.6, 0.6]} />
      <mesh material={mats.stone} position-y={0.1} castShadow receiveShadow>
        <cylinderGeometry args={[0.15, 0.16, 0.2, 10]} />
      </mesh>
      <mesh position-y={0.25} castShadow>
        <coneGeometry args={[0.2, 0.12, 10]} />
        <meshStandardMaterial color={color} roughness={0.8} />
      </mesh>
      <mesh material={mats.lantern} position={[0, 0.09, 0.152]}>
        <boxGeometry args={[0.1, 0.07, 0.004]} />
      </mesh>
      <Palm position={[-0.28, 0, 0.05]} scale={0.75} seed="ck" />
      <Bush position={[0.25, 0.04, 0.12]} s={0.05} />
    </group>
  );
}

const magentaGlow = new MeshBasicMaterial({ color: THEMES.nightlife.light, toneMapped: false });

function Warehouse() {
  return (
    <group>
      <ContactAO size={[0.75, 0.6]} />
      <mesh material={mats.steel} position-y={0.12} castShadow receiveShadow>
        <boxGeometry args={[0.48, 0.24, 0.32]} />
      </mesh>
      {[-0.16, 0, 0.16].map((x) => (
        <mesh key={x} material={mats.steel} position={[x, 0.27, 0]} rotation-z={0.6} castShadow>
          <boxGeometry args={[0.12, 0.012, 0.32]} />
        </mesh>
      ))}
      <mesh material={magentaGlow} position={[0, 0.06, 0.162]}>
        <boxGeometry args={[0.36, 0.02, 0.004]} />
      </mesh>
    </group>
  );
}

function Viewpoint() {
  return (
    <group>
      <ContactAO size={[0.5, 0.5]} />
      <mesh material={mats.mud} position-y={0.06} castShadow receiveShadow>
        <cylinderGeometry args={[0.22, 0.25, 0.12, 8]} />
      </mesh>
      <mesh material={mats.mudDark} position-y={0.24} castShadow>
        <cylinderGeometry args={[0.05, 0.07, 0.26, 6]} />
      </mesh>
      <Palm position={[0.25, 0, -0.15]} scale={0.7} seed="vp" />
    </group>
  );
}

function PlaceDiorama({ place, color }: { place: Place; color: string }) {
  switch (place.id) {
    case 'masmak':
      return <Fort position={[0, 0, 0]} s={0.8} />;
    case 'national-museum':
    case 'diriyah-museum':
      return <Museum position={[0, 0, 0]} rot={0.2} />;
    case 'at-turaif':
      return <TuraifRuins position={[0, 0, 0]} />;
    case 'al-faisaliah':
      return <group scale={0.55}><Faisaliah position={[0, 0, 0]} /></group>;
    case 'sky-bridge':
      return <group scale={0.42}><KingdomCentre position={[0, 0, 0]} /></group>;
    case 'turaif-viewpoint':
      return <Viewpoint />;
  }
  switch (place.category) {
    case 'heritage':
      return <MudHouse position={[0, 0, 0]} size={[0.34, 0.24, 0.3]} rot={0.3} />;
    case 'food':
      return <FoodHall color={color} />;
    case 'coffee':
      return <CoffeeKiosk color={color} />;
    case 'music':
      return <Warehouse />;
    default:
      return <Viewpoint />;
  }
}

/* ---------- Badge over each place ---------- */

function PlaceBadge({ place, visited, locked, dimmed, isFinal }: { place: Place; visited: boolean; locked: boolean; dimmed: boolean; isFinal: boolean }) {
  const { t } = useTranslation();
  const openPlace = useStore((s) => s.openPlace);
  const lang = useStore((s) => s.lang);
  const name = t(`places.${place.id}.name`);
  const label = `${name}, ${t(`categories.${place.category}`)}${place.voucher ? `, ${t('voucher.badge')}` : ''}${visited ? `, ${t('place.checkedIn')}` : ''}`;
  return (
    <button
      className={`badge${visited ? ' is-visited' : ''}${locked ? ' is-locked' : ''}${dimmed ? ' is-dimmed' : ''}${isFinal ? ' is-final' : ''}`}
      onClick={() => openPlace(place.id)}
      aria-label={label}
      // The overlay layer is always LTR; mirror the check and star pair for Arabic.
      dir={isRtl(lang) ? 'rtl' : 'ltr'}
    >
      <span className="badge-disc">
        {locked ? <Lock size={18} strokeWidth={2} /> : <CategoryIcon category={place.category} size={20} />}
      </span>
      <AnimatePresence>
        {visited && (
          <motion.span
            className="badge-check"
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 520, damping: 16, delay: 0.15 }}
          >
            <Check size={14} strokeWidth={3.2} />
          </motion.span>
        )}
      </AnimatePresence>
      {/* initial={false}: places visited before this map opened show their star without the pop. */}
      <AnimatePresence initial={false}>{visited && <EarnedStar key="star" />}</AnimatePresence>
      {place.voucher && !locked && (
        <span className="badge-voucher" aria-hidden>
          <Ticket size={11} strokeWidth={2.6} />
        </span>
      )}
      {isFinal && !visited && (
        <span className="badge-flag" aria-hidden>
          <Flag size={12} strokeWidth={2.4} />
        </span>
      )}
    </button>
  );
}

/* ---------- One leg of the route: dashed, turning solid green once its destination is visited ---------- */

function routePoints(a: Vector3, b: Vector3, bend: number) {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const dir = b.clone().sub(a);
  const perp = new Vector3(-dir.z, 0, dir.x).normalize().multiplyScalar(dir.length() * 0.18 * bend);
  mid.add(perp);
  return new QuadraticBezierCurve3(a, mid, b).getPoints(28);
}

function Leg({ points, index, solid, color, locked }: { points: Vector3[]; index: number; solid: boolean; color: string; locked: boolean }) {
  const dashed = useRef<Line2>(null);
  const filled = useRef<Line2>(null);
  const solidSince = useRef<number | null>(solid ? -10 : null);
  const segs = points.length - 1;

  useEffect(() => {
    solidSince.current = solid ? (solidSince.current === -10 ? -10 : performance.now() / 1000) : null;
  }, [solid]);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    const startAt = flight.enteredAt + FLY_DURATION * 0.92 + index * 0.16;
    let p = flight.reducedMotion ? 1 : clamp01((now - startAt) / 0.38);
    // On the way out the route is wiped before the islands sink.
    p *= clamp01((flight.t - 0.5) * 2);
    const g = dashed.current?.geometry as unknown as { instanceCount: number } | undefined;
    if (g) g.instanceCount = Math.floor(p * segs);
    const f = filled.current?.geometry as unknown as { instanceCount: number } | undefined;
    if (f) {
      let q = 0;
      if (solidSince.current !== null) {
        q = solidSince.current === -10 || flight.reducedMotion ? 1 : clamp01((performance.now() / 1000 - solidSince.current - 0.05) / 0.5);
      }
      f.instanceCount = Math.floor(Math.min(q, p) * segs);
    }
  });

  return (
    <group>
      <Line
        ref={dashed as never}
        points={points}
        color={locked ? '#8D88C7' : '#FFFFFF'}
        transparent
        opacity={locked ? 0.5 : 0.85}
        lineWidth={3}
        dashed
        dashSize={0.16}
        gapSize={0.13}
        renderOrder={4}
        depthWrite={false}
      />
      <Line ref={filled as never} points={points} color={color} lineWidth={4.5} renderOrder={5} depthWrite={false} />
    </group>
  );
}

/* ---------- The user's gold marker: starts at the hotel, hops to each new check-in ---------- */

function UserMarker({ to }: { to: Vector3 }) {
  const g = useRef<Group>(null);
  const ring = useRef<Mesh>(null);
  const from = useRef(to.clone());
  const cur = useRef(to.clone());
  const hopStart = useRef(-1);
  const target = useRef(to.clone());

  useEffect(() => {
    if (target.current.distanceTo(to) < 1e-3) return;
    from.current.copy(cur.current);
    target.current.copy(to);
    hopStart.current = performance.now() / 1000;
  }, [to]);

  useFrame((state) => {
    const now = performance.now() / 1000;
    if (hopStart.current > 0) {
      const k = flight.reducedMotion ? 1 : clamp01((now - hopStart.current) / 0.7);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      cur.current.copy(from.current).lerp(target.current, e);
      cur.current.y += Math.sin(Math.PI * k) * 1.1;
      if (k >= 1) hopStart.current = -1;
    } else {
      cur.current.copy(target.current);
    }
    const rise = clamp01((flight.t - 0.6) / 0.4);
    if (g.current) {
      const bob = flight.reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 2.4) * 0.05;
      g.current.position.set(cur.current.x, cur.current.y + 1.05 + bob, cur.current.z);
      g.current.scale.setScalar(Math.max(0.001, rise) * 1.7);
    }
    if (ring.current) {
      const ph = flight.reducedMotion ? 0.5 : (state.clock.elapsedTime * 0.8) % 1;
      ring.current.position.set(cur.current.x, target.current.y + 0.02, cur.current.z);
      ring.current.scale.setScalar((0.25 + ph * 0.5) * Math.max(0.001, rise));
      (ring.current.material as MeshBasicMaterial).opacity = (1 - ph) * 0.8;
    }
  });

  return (
    <group>
      <group ref={g}>
        <mesh position-y={0.16}>
          <sphereGeometry args={[0.13, 20, 16]} />
          <meshStandardMaterial color={COLORS.gold} emissive={COLORS.gold} emissiveIntensity={0.55} roughness={0.35} />
        </mesh>
        <mesh position-y={-0.04} rotation-x={Math.PI}>
          <coneGeometry args={[0.1, 0.26, 16]} />
          <meshStandardMaterial color={COLORS.gold} emissive={COLORS.gold} emissiveIntensity={0.4} roughness={0.35} />
        </mesh>
        <mesh position-y={0.16} position-z={0.11}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshBasicMaterial color={COLORS.night} />
        </mesh>
      </group>
      <mesh ref={ring} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.8, 1, 40]} />
        <meshBasicMaterial color={COLORS.gold} transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

/* ---------- A single place: rises out of the sea on arrival ---------- */

function PlaceNode({ place, pos, order, color, locked, visited, dimmed, isFinal }: {
  place: Place; pos: Vector3; order: number; color: string; locked: boolean; visited: boolean; dimmed: boolean; isFinal: boolean;
}) {
  const g = useRef<Group>(null);
  const overlay = useRef<HTMLDivElement>(null);
  useFrame((state) => {
    if (!g.current) return;
    const now = state.clock.elapsedTime;
    const start = flight.enteredAt + FLY_DURATION * 0.6 + order * 0.07;
    let k = flight.reducedMotion ? 1 : easeOutBack(clamp01((now - start) / 0.55));
    if (flight.arrivedAt >= 0) k = Math.max(k, 1);
    // On the way out, islands sink as the camera pulls away.
    k = Math.min(k, clamp01((flight.t - 0.35) / 0.45) * 1.08);
    g.current.position.set(pos.x, SINK * (1 - k), pos.z);
    g.current.visible = k > 0.01;
    syncOverlay(overlay.current, k);
  });
  const vivid = visited ? 1 : locked ? 0.15 : dimmed ? 0.25 : 0.62;
  return (
    <group ref={g} position={[pos.x, SINK, pos.z]}>
      <Island radius={PLACE_RADIUS} seed={place.id} glow={visited ? COLORS.completed : color} vivid={vivid}>
        <PlaceDiorama place={place} color={color} />
      </Island>
      <Html portal={htmlPortal} position={[0, ISLAND_TOP + 0.95, 0]} center zIndexRange={[20, 10]} style={{ pointerEvents: 'auto' }}>
        <div ref={overlay} className="overlay-wrap">
          <PlaceBadge place={place} visited={visited} locked={locked} dimmed={dimmed} isFinal={isFinal} />
        </div>
      </Html>
    </group>
  );
}

/** A metro station, or for a downtown without one, the "ride with a Rafeeq" chip in its place. */
function MetroNode({ id, pos, order, noMetro = false }: { id: string; pos: Vector3; order: number; noMetro?: boolean }) {
  const { t, i18n } = useTranslation();
  const openPlace = useStore((s) => s.openPlace);
  const openRafeeq = useStore((s) => s.openRafeeq);
  const filter = useStore((s) => s.filter);
  const g = useRef<Group>(null);
  const overlay = useRef<HTMLDivElement>(null);
  useFrame((state) => {
    if (!g.current) return;
    const start = flight.enteredAt + FLY_DURATION * 0.75 + order * 0.07;
    let k = flight.reducedMotion ? 1 : easeOutBack(clamp01((state.clock.elapsedTime - start) / 0.5));
    if (flight.arrivedAt >= 0) k = 1;
    k = Math.min(k, clamp01((flight.t - 0.35) / 0.45));
    g.current.position.set(pos.x, SINK * 0.5 * (1 - k), pos.z);
    g.current.visible = k > 0.01;
    syncOverlay(overlay.current, k);
  });
  const dim = !noMetro && filter !== null && filter !== 'metro';
  const name = noMetro ? t('map.noMetroTitle') : t(`places.${id}.name`);
  const line = noMetro ? t('map.noMetroRide') : t('metro.blue');
  return (
    <group ref={g} position={[pos.x, SINK, pos.z]}>
      <mesh position-y={0.06} receiveShadow>
        <cylinderGeometry args={[0.36, 0.4, 0.14, 24]} />
        <meshStandardMaterial color="#D8DCE6" roughness={0.7} />
      </mesh>
      <mesh position-y={0.012} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.42, 0.56, 32]} />
        <meshBasicMaterial color={noMetro ? COLORS.gold : COLORS.metroBlue} transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </mesh>
      <Html portal={htmlPortal} position={[0, 0.5, 0]} center zIndexRange={[20, 10]}>
        <div ref={overlay} className="overlay-wrap">
        <button
          dir={i18n.dir()}
          className={`metro-chip${dim ? ' is-dimmed' : ''}${noMetro ? ' is-none' : ''}`}
          onClick={() => (noMetro ? openRafeeq(true) : openPlace(id))}
          aria-label={noMetro ? `${name}. ${line}` : `${t('metro.station')}: ${name}, ${line}`}
        >
          <span className="metro-icon">{noMetro ? <Car size={16} strokeWidth={2.2} /> : <TramFront size={16} strokeWidth={2.2} />}</span>
          <span className="metro-text">
            <span className="metro-name">{name}</span>
            <span className="metro-line">{line}</span>
          </span>
        </button>
        </div>
      </Html>
    </group>
  );
}

export function DowntownLayer({ downtown, origin, layout }: { downtown: Downtown; origin: Vector3; layout: MapLayout }) {
  const { t, i18n } = useTranslation();
  const visited = useStore((s) => s.visited);
  const filter = useStore((s) => s.filter);
  const lastCheckIn = useStore((s) => s.lastCheckIn);
  const theme = THEMES[downtown.theme];
  const unlocked = isBonusUnlocked(downtown, visited);
  const zoneRef = useRef<HTMLDivElement>(null);
  useFrame(() => syncOverlay(zoneRef.current, clamp01((flight.t - 0.6) / 0.4) * 1.2));

  const pos = (id: string) => {
    const n = layout.nodes[id];
    return new Vector3(origin.x + n.x, 0, origin.z + n.z);
  };

  const legs = useMemo(() => {
    const out: { key: string; points: Vector3[]; to: string; bonus: boolean }[] = [];
    const add = (ids: string[], bonus: boolean, startId: string) => {
      let prev = startId;
      ids.forEach((id, i) => {
        const a = pos(prev);
        const b = pos(id);
        // Legs from the hotel leave from its island's rim, not from under the island.
        if (prev === 'hotel') a.add(b.clone().sub(a).setY(0).normalize().multiplyScalar(HOME_RADIUS * 1.04));
        a.y = b.y = 0.035;
        out.push({ key: `${prev}-${id}`, points: routePoints(a, b, i % 2 ? 1 : -1), to: id, bonus });
        prev = id;
      });
    };
    add(downtown.route, false, 'hotel');
    if (downtown.bonus) add(downtown.bonus.route, true, 'hotel');
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downtown, layout, origin]);

  const places = allPlaces(downtown);
  const bonusIds = new Set(downtown.bonus?.places.map((p) => p.id) ?? []);

  // The marker stands on the latest place checked in here, or at the hotel.
  const lastHere = useMemo(() => {
    let best: string | null = null;
    let at = -1;
    for (const p of places) if (visited[p.id] && visited[p.id] > at) { at = visited[p.id]; best = p.id; }
    return best;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visited, downtown]);
  const markerTarget = useMemo(() => {
    if (!lastHere) {
      const h = pos('hotel');
      return new Vector3(h.x + HOME_RADIUS * 0.45, ISLAND_TOP * HOTEL_SCALE, h.z + HOME_RADIUS * 0.6);
    }
    const p = pos(lastHere);
    // Beside the badge, on the island's front edge, so neither hides the other.
    return new Vector3(p.x + 0.42, ISLAND_TOP + 0.1, p.z + 0.38);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastHere, layout, origin, lastCheckIn]);

  const bonusCenter = useMemo(() => {
    if (!downtown.bonus) return null;
    // The framing gives the zone label its own place, clear of every other label.
    if (layout.nodes['jax-zone']) return pos('jax-zone');
    const ps = downtown.bonus.places.map((p) => pos(p.id));
    const c = ps.reduce((s, p) => s.add(p), new Vector3()).multiplyScalar(1 / ps.length);
    const maxZ = Math.max(...ps.map((p) => p.z));
    return new Vector3(c.x, 0, maxZ + 1.05);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [downtown, layout, origin]);

  return (
    <group>
      {legs.map((l, i) => (
        <Leg
          key={l.key}
          points={l.points}
          index={l.bonus ? downtown.route.length + i * 0.3 : i}
          solid={!!visited[l.to]}
          color={COLORS.completed}
          locked={l.bonus && !unlocked}
        />
      ))}
      {places.map((p, i) => {
        const isBonus = bonusIds.has(p.id);
        return (
          <PlaceNode
            key={p.id}
            place={p}
            pos={pos(p.id)}
            order={i}
            color={isBonus ? THEMES.nightlife.light : theme.light}
            locked={isBonus && !unlocked}
            visited={!!visited[p.id]}
            dimmed={filter !== null && filter !== p.category && !(filter === 'coffee' && p.alsoCoffee)}
            isFinal={!!p.final}
          />
        );
      })}
      {downtown.metro.map((m, i) => (
        <MetroNode key={m.id} id={m.id} pos={pos(m.id)} order={places.length + i} />
      ))}
      {downtown.noMetroHint && layout.nodes['no-metro'] && <MetroNode id="no-metro" pos={pos('no-metro')} order={places.length} noMetro />}
      {bonusCenter && (
        <Html portal={htmlPortal} position={[bonusCenter.x, 0.1, bonusCenter.z]} center zIndexRange={[19, 10]}>
          <div ref={zoneRef} dir={i18n.dir()} className={`zone-label${unlocked ? ' is-open' : ''}`}>
            {!unlocked && <Lock size={13} strokeWidth={2.4} aria-hidden />}
            <span>{t('places.jax.name')}</span>
          </div>
        </Html>
      )}
      <UserMarker to={markerTarget} />
    </group>
  );
}

