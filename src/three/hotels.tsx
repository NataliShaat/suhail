import { Component, Suspense, useMemo, type ReactNode } from 'react';
import { useGLTF, Line } from '@react-three/drei';
import { Box3, CanvasTexture, Color, DoubleSide, ExtrudeGeometry, MeshBasicMaterial, MeshStandardMaterial, Path, RepeatWrapping, Shape, Vector3 } from 'three';
import { THEMES } from '../config';
import type { HotelKind } from '../data';
import { Bush, ContactAO, Crenellation, Lantern, mats, Palm, Windows, type FaceSpec } from './props';

/* ---------------- Ramada: a tall slim tower with a red edge strip ---------------- */

const RED = THEMES.oldcity.light;
const redGlow = new MeshBasicMaterial({ color: RED, toneMapped: false });

function RamadaHotel() {
  const W = 0.5;
  const D = 0.42;
  const H = 2.75;
  const windows = useMemo<FaceSpec[]>(
    () => [
      { center: [0, 0.22 + H / 2, 0], size: [W, H - 0.3, D], floors: 22, cols: 6, faces: ['pz', 'px'], winH: 0.05 },
      { center: [0, 0.22 + H / 2, 0], size: [W, H - 0.3, D], floors: 22, cols: 5, faces: ['nx', 'nz'], winH: 0.05 },
    ],
    [],
  );
  return (
    <group>
      <ContactAO size={[1.6, 1.4]} />
      {/* Podium */}
      <mesh material={mats.glass} position={[0, 0.11, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.78, 0.22, 0.64]} />
      </mesh>
      {/* Tower */}
      <mesh material={mats.white} position={[0, 0.22 + H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W, H, D]} />
      </mesh>
      {/* Blue glass spine on the west face, as on the real building */}
      <mesh material={mats.glass} position={[-W / 2 - 0.005, 0.22 + H / 2, 0]}>
        <boxGeometry args={[0.03, H * 0.98, D * 0.6]} />
      </mesh>
      <Windows specs={windows} seed="ramada" lit={0.55} />
      {/* Glowing red vertical edge strip */}
      <mesh material={redGlow} position={[W / 2 + 0.008, 0.22 + H / 2, D / 2 + 0.008]}>
        <boxGeometry args={[0.03, H, 0.03]} />
      </mesh>
      {/* Red sign at the top */}
      <mesh material={redGlow} position={[0.02, 0.22 + H - 0.1, D / 2 + 0.012]}>
        <boxGeometry args={[0.3, 0.055, 0.01]} />
      </mesh>
      <mesh material={redGlow} position={[-0.17, 0.22 + H - 0.1, D / 2 + 0.012]}>
        <cylinderGeometry args={[0.035, 0.035, 0.01, 16]} />
      </mesh>
      <pointLight color={RED} intensity={1.2} distance={1.6} position={[0.4, 1.4, 0.5]} />
      {[[-0.5, 0, 0.45], [0.5, 0, 0.48], [-0.42, 0, -0.42], [0.55, 0, -0.3]].map((p, i) => (
        <Palm key={i} position={p as [number, number, number]} scale={1.1} seed={`rp${i}`} />
      ))}
    </group>
  );
}

/* Masmak-style fort: a mud block with four tapering corner towers. */
function Fort({ position, s = 1 }: { position: [number, number, number]; s?: number }) {
  return (
    <group position={position} scale={s}>
      <ContactAO size={[0.9, 0.9]} />
      <mesh material={mats.mud} position-y={0.17} castShadow receiveShadow>
        <boxGeometry args={[0.5, 0.34, 0.42]} />
      </mesh>
      <Crenellation width={0.5} depth={0.42} y={0.34 + 0.025} step={0.08} />
      {[[-0.25, -0.21], [0.25, -0.21], [-0.25, 0.21], [0.25, 0.21]].map(([x, z], i) => (
        <mesh key={i} material={mats.mudDark} position={[x, 0.24, z]} castShadow>
          <cylinderGeometry args={[0.06, 0.085, 0.48, 7]} />
        </mesh>
      ))}
      <mesh material={mats.lantern} position={[0, 0.1, 0.212]}>
        <boxGeometry args={[0.07, 0.12, 0.005]} />
      </mesh>
    </group>
  );
}

/* A long low museum block with a stepped front. */
function Museum({ position, rot = 0 }: { position: [number, number, number]; rot?: number }) {
  return (
    <group position={position} rotation-y={rot}>
      <ContactAO size={[1, 0.7]} />
      <mesh material={mats.stone} position-y={0.1} castShadow receiveShadow>
        <boxGeometry args={[0.62, 0.2, 0.32]} />
      </mesh>
      <mesh material={mats.stone} position={[0.08, 0.24, -0.02]} castShadow>
        <boxGeometry args={[0.38, 0.1, 0.24]} />
      </mesh>
      <mesh material={mats.lantern} position={[0, 0.07, 0.162]}>
        <boxGeometry args={[0.4, 0.04, 0.004]} />
      </mesh>
    </group>
  );
}

function MudHouse({ position, size = [0.26, 0.2, 0.24], rot = 0 }: { position: [number, number, number]; size?: [number, number, number]; rot?: number }) {
  const [w, h, d] = size;
  const specs = useMemo<FaceSpec[]>(() => [{ center: [0, h * 0.55, 0], size: [w, h * 0.7, d], floors: 1, cols: 2, faces: ['pz', 'px'], winW: 0.035, winH: 0.035 }], [w, h, d]);
  return (
    <group position={position} rotation-y={rot}>
      <mesh material={mats.mud} position-y={h / 2} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
      </mesh>
      <Crenellation width={w} depth={d} y={h + 0.02} step={0.07} />
      <Windows specs={specs} seed={`mh${position.join()}`} lit={0.8} />
    </group>
  );
}

/* ---------------- Bab Samhan: a Najdi village of mud-brick blocks around a courtyard ---------------- */

let sailTexture: CanvasTexture | null = null;
function getSailTexture() {
  if (sailTexture) return sailTexture;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#3B2A22' : '#E9D9BC';
    g.fillRect(0, i * 8, 64, 8);
  }
  sailTexture = new CanvasTexture(c);
  sailTexture.wrapS = sailTexture.wrapT = RepeatWrapping;
  return sailTexture;
}

function Sail({ position, rot }: { position: [number, number, number]; rot: [number, number, number] }) {
  const tex = useMemo(getSailTexture, []);
  return (
    <mesh position={position} rotation={rot} castShadow>
      <planeGeometry args={[0.42, 0.22]} />
      <meshStandardMaterial map={tex} side={DoubleSide} roughness={0.9} />
    </mesh>
  );
}

function BabSamhanHotel() {
  const blocks: { p: [number, number, number]; s: [number, number, number] }[] = [
    { p: [-0.55, 0, -0.35], s: [0.5, 0.62, 0.42] },
    { p: [0.05, 0, -0.55], s: [0.6, 0.78, 0.36] },
    { p: [0.62, 0, -0.25], s: [0.4, 0.55, 0.55] },
    { p: [-0.62, 0, 0.32], s: [0.38, 0.45, 0.46] },
    { p: [0.6, 0, 0.42], s: [0.42, 0.4, 0.4] },
  ];
  const windowSpecs = useMemo<FaceSpec[]>(
    () =>
      blocks.map((b) => ({
        center: [b.p[0], b.s[1] / 2, b.p[2]] as [number, number, number],
        size: b.s,
        floors: Math.max(2, Math.round(b.s[1] / 0.2)),
        cols: Math.max(2, Math.round(b.s[0] / 0.15)),
        winW: 0.04,
        winH: 0.045,
        margin: 0.18,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <group>
      <ContactAO size={[2.2, 2]} />
      {/* Courtyard paving */}
      <mesh material={mats.plaza} position={[0, 0.006, 0.05]} rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[0.95, 0.75]} />
      </mesh>
      {blocks.map((b, i) => (
        <group key={i} position={b.p}>
          <mesh material={i % 2 ? mats.mudDark : mats.mud} position-y={b.s[1] / 2} castShadow receiveShadow>
            <boxGeometry args={b.s} />
          </mesh>
          {/* Stepped parapet: a lower tier, then the crenellated top */}
          <mesh material={mats.mud} position={[b.s[0] * 0.12, b.s[1] + 0.06, -b.s[2] * 0.1]} castShadow>
            <boxGeometry args={[b.s[0] * 0.55, 0.12, b.s[2] * 0.6]} />
          </mesh>
          <Crenellation width={b.s[0]} depth={b.s[2]} y={b.s[1] + 0.022} step={0.075} />
        </group>
      ))}
      <Windows specs={windowSpecs} seed="babsamhan" lit={0.75} />
      {/* Striped shade sails over the courtyard, on dark poles */}
      <Sail position={[-0.12, 0.42, 0.05]} rot={[-Math.PI / 2 + 0.25, 0, 0.18]} />
      <Sail position={[0.2, 0.46, 0.15]} rot={[-Math.PI / 2 - 0.2, 0, -0.25]} />
      {[[-0.34, 0.2], [0.1, -0.12], [0.42, 0.3], [-0.05, 0.36]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.24, z]} material={mats.trunk}>
          <cylinderGeometry args={[0.008, 0.008, 0.48, 4]} />
        </mesh>
      ))}
      {/* Warm lanterns and a small pool */}
      {[[-0.3, 0.03, -0.12], [0.32, 0.03, -0.05], [-0.2, 0.03, 0.42], [0.3, 0.03, 0.45], [0, 0.03, -0.25]].map((p, i) => (
        <Lantern key={i} position={p as [number, number, number]} />
      ))}
      <mesh position={[0.02, 0.012, 0.1]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshBasicMaterial color="#F6C56B" toneMapped={false} />
      </mesh>
      <pointLight color="#FFB55E" intensity={2.2} distance={1.8} position={[0, 0.45, 0.1]} />
      {[[-1.05, 0, -0.75], [-1.15, 0, 0.0], [1.1, 0, 0.0], [0.95, 0, 0.85], [-0.85, 0, 0.9], [0.0, 0, 1.05], [-0.3, 0, -1.1]].map((p, i) => (
        <Palm key={i} position={p as [number, number, number]} scale={1.15} seed={`bp${i}`} />
      ))}
    </group>
  );
}

/* At-Turaif hint: tapering mud towers on a wall. */
function TuraifRuins({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <ContactAO size={[0.9, 0.6]} />
      <mesh material={mats.mudDark} position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[0.6, 0.16, 0.1]} />
      </mesh>
      {[-0.28, 0.0, 0.28].map((x, i) => (
        <mesh key={i} material={mats.mud} position={[x, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.045, 0.075, 0.36, 4]} />
        </mesh>
      ))}
    </group>
  );
}

/* ---------------- Comfort Olaya: a stone-and-glass block with Kingdom Centre nearby ---------------- */

const tealGlow = new MeshBasicMaterial({ color: THEMES.modern.light, toneMapped: false });
const goldGlow = new MeshBasicMaterial({ color: '#F2C46D', toneMapped: false });

function kingdomCentreGeometry() {
  const H = 3.0;
  const w0 = 0.34;
  const shape = new Shape();
  const steps = 16;
  // Outer outline: slightly convex sides that taper to the top.
  shape.moveTo(-w0, 0);
  shape.lineTo(w0, 0);
  for (let i = 1; i <= steps; i++) {
    const y = (i / steps) * H;
    const x = w0 * (1 - 0.32 * Math.pow(y / H, 1.6));
    shape.lineTo(x, y);
  }
  for (let i = steps; i >= 0; i--) {
    const y = (i / steps) * H;
    const x = w0 * (1 - 0.32 * Math.pow(y / H, 1.6));
    shape.lineTo(-x, y);
  }
  // The inverted arch: a parabola from the base of the opening up to the sky bridge.
  const hole = new Path();
  const yBase = H * 0.63;
  const yTop = H - 0.07;
  const halfTop = w0 * 0.58;
  const n = 18;
  hole.moveTo(-halfTop, yTop);
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n;
    hole.lineTo(u * halfTop, yBase + (yTop - yBase) * u * u);
  }
  hole.lineTo(-halfTop, yTop);
  shape.holes.push(hole);
  const geo = new ExtrudeGeometry(shape, { depth: 0.24, bevelEnabled: false, curveSegments: 1 });
  geo.translate(0, 0, -0.12);
  return { geo, H, yBase, yTop, halfTop };
}

function KingdomCentre({ position }: { position: [number, number, number] }) {
  const kc = useMemo(kingdomCentreGeometry, []);
  const arch = useMemo(() => {
    const pts: Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const u = -1 + (2 * i) / 24;
      pts.push(new Vector3(u * kc.halfTop, kc.yBase + (kc.yTop - kc.yBase) * u * u, 0.125));
    }
    return pts;
  }, [kc]);
  const glassKC = useMemo(() => new MeshStandardMaterial({ color: '#5E6E8E', roughness: 0.25, metalness: 0.55, flatShading: true }), []);
  return (
    <group position={position}>
      <ContactAO size={[1, 0.6]} />
      <mesh geometry={kc.geo} material={glassKC} castShadow receiveShadow />
      <Line points={arch} color={THEMES.modern.light} lineWidth={2.2} toneMapped={false} />
      <mesh material={tealGlow} position={[0, kc.yTop + 0.035, 0]}>
        <boxGeometry args={[kc.halfTop * 2 + 0.02, 0.025, 0.06]} />
      </mesh>
      {/* Edge lights up both sides */}
      {[-1, 1].map((sgn) => (
        <mesh key={sgn} material={tealGlow} position={[sgn * 0.3, 0.9, 0.125]} rotation-z={sgn * 0.035}>
          <boxGeometry args={[0.012, 1.8, 0.004]} />
        </mesh>
      ))}
    </group>
  );
}

function ComfortHotel() {
  const W = 0.66;
  const D = 0.5;
  const H = 1.3;
  const specs = useMemo<FaceSpec[]>(
    () => [{ center: [0.08, 0.12 + H / 2, 0], size: [W * 0.55, H - 0.12, D], floors: 10, cols: 3, faces: ['pz', 'px', 'nz'], winW: 0.07, winH: 0.07 }],
    [],
  );
  return (
    <group>
      <ContactAO size={[1.4, 1.2]} />
      <mesh material={mats.glass} position={[0, 0.06, 0]} castShadow receiveShadow>
        <boxGeometry args={[W + 0.06, 0.12, D + 0.06]} />
      </mesh>
      {/* Stone frame */}
      <mesh material={mats.stone} position={[-W * 0.25, 0.12 + H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.48, H, D]} />
      </mesh>
      {/* Dark glass bay */}
      <mesh material={mats.glassTeal} position={[W * 0.24, 0.12 + H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[W * 0.52, H + 0.06, D * 0.94]} />
      </mesh>
      <Windows specs={specs} seed="comfort" lit={0.7} />
      {/* Gold light lines between floors on the stone, as on the real facade */}
      {[0.38, 0.64, 0.9, 1.16].map((y) => (
        <mesh key={y} material={goldGlow} position={[-W * 0.25, y, D / 2 + 0.004]}>
          <boxGeometry args={[W * 0.48, 0.01, 0.004]} />
        </mesh>
      ))}
      <mesh material={mats.stone} position={[-W * 0.25, 0.12 + H + 0.08, 0]} castShadow>
        <boxGeometry args={[W * 0.4, 0.16, D * 0.8]} />
      </mesh>
      <mesh material={goldGlow} position={[-W * 0.25, 0.12 + H + 0.08, D * 0.4 + 0.004]}>
        <boxGeometry args={[0.16, 0.035, 0.004]} />
      </mesh>
      <pointLight color={THEMES.modern.light} intensity={1.1} distance={1.8} position={[0.6, 1.2, 0.6]} />
    </group>
  );
}

/* Al Faisaliah hint: a four-sided tapering tower with a golden globe. */
function Faisaliah({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <ContactAO size={[0.6, 0.6]} />
      <mesh material={mats.steel} position-y={0.85} rotation-y={Math.PI / 4} castShadow>
        <cylinderGeometry args={[0.0, 0.2, 1.7, 4]} />
      </mesh>
      <mesh material={mats.gold} position-y={1.08}>
        <sphereGeometry args={[0.075, 16, 12]} />
      </mesh>
    </group>
  );
}

function GlassTower({ position, h, w = 0.26, seed }: { position: [number, number, number]; h: number; w?: number; seed: string }) {
  const specs = useMemo<FaceSpec[]>(() => [{ center: [0, h / 2, 0], size: [w, h, w], floors: Math.round(h / 0.12), cols: 3, winW: 0.04, winH: 0.03 }], [h, w]);
  return (
    <group position={position}>
      <mesh material={mats.glass} position-y={h / 2} castShadow receiveShadow>
        <boxGeometry args={[w, h, w]} />
      </mesh>
      <Windows specs={specs} seed={seed} lit={0.45} warm={new Color('#CFE6FF')} />
    </group>
  );
}

/* ---------------- Assembly ---------------- */

/** Everything that stands on a hotel's island in the city overview, around the hotel itself. */
export function HotelIslandContents({ kind, model }: { kind: HotelKind; model: string | null }) {
  return (
    <group>
      <HotelModel kind={kind} model={model} />
      {kind === 'ramada' && (
        <>
          <Fort position={[-0.95, 0, 0.55]} s={1.05} />
          <Museum position={[0.95, 0, 0.6]} rot={-0.4} />
          <MudHouse position={[-0.95, 0, -0.55]} />
          <MudHouse position={[0.95, 0, -0.45]} size={[0.3, 0.16, 0.22]} rot={0.3} />
          <Bush position={[0.2, 0.04, 0.95]} />
          <Bush position={[-0.35, 0.04, 1.05]} s={0.06} />
        </>
      )}
      {kind === 'babsamhan' && (
        <>
          <TuraifRuins position={[0.55, 0, 1.05]} />
          <Bush position={[-1.0, 0.04, 0.45]} />
          <Bush position={[1.15, 0.04, -0.55]} s={0.06} />
        </>
      )}
      {kind === 'comfort' && (
        <>
          <KingdomCentre position={[0.85, 0, -0.55]} />
          <Faisaliah position={[-0.9, 0, 0.6]} />
          <GlassTower position={[-0.95, 0, -0.45]} h={0.9} seed="gt1" />
          <GlassTower position={[0.95, 0, 0.6]} h={0.6} w={0.3} seed="gt2" />
          <Palm position={[0.3, 0, 0.75]} seed="cp1" />
          <Palm position={[-0.35, 0, 0.8]} seed="cp2" />
        </>
      )}
    </group>
  );
}

function ProceduralHotel({ kind }: { kind: HotelKind }) {
  if (kind === 'ramada') return <RamadaHotel />;
  if (kind === 'babsamhan') return <BabSamhanHotel />;
  return <ComfortHotel />;
}

const TARGET_HEIGHT: Record<HotelKind, number> = { ramada: 2.95, babsamhan: 0.9, comfort: 1.5 };

function GlbHotel({ url, kind }: { url: string; kind: HotelKind }) {
  const { scene } = useGLTF(url);
  const obj = useMemo(() => {
    const clone = scene.clone(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const s = TARGET_HEIGHT[kind] / Math.max(size.y, 1e-3);
    clone.scale.setScalar(s);
    const c = box.getCenter(new Vector3());
    clone.position.set(-c.x * s, -box.min.y * s, -c.z * s);
    clone.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    return clone;
  }, [scene, kind]);
  return <primitive object={obj} />;
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * The hotel itself. Set `model` in downtowns.json to a file in /public/models/ (for example
 * "/models/ramada.glb") and it replaces the procedural building, scaled to the same height.
 */
export function HotelModel({ kind, model }: { kind: HotelKind; model: string | null }) {
  const procedural = <ProceduralHotel kind={kind} />;
  if (!model) return procedural;
  return (
    <ModelBoundary fallback={procedural}>
      <Suspense fallback={procedural}>
        <GlbHotel url={model} kind={kind} />
      </Suspense>
    </ModelBoundary>
  );
}

export const ISLAND_COLORS: Record<HotelKind, { top: string; side: string }> = {
  ramada: { top: '#E4D1B0', side: '#8F6C4B' },
  babsamhan: { top: '#E0C69C', side: '#94704A' },
  comfort: { top: '#DCD6CA', side: '#7E7266' },
};

// Re-exported for the place islands.
export { Fort, Museum, MudHouse, TuraifRuins, KingdomCentre, Faisaliah, GlassTower };
