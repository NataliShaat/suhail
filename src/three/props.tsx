import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  CanvasTexture,
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
} from 'three';
import { flight, seeded } from './sceneState';

const WARM = new Color('#FFC873');
const WARM_SOFT = new Color('#F2A85A');
const DIM = new Color('#2C2A4E');

// Shared materials keep draw state small.
export const mats = {
  trunk: new MeshStandardMaterial({ color: '#7A5A3C', roughness: 1, flatShading: true }),
  frond: new MeshStandardMaterial({ color: '#3F8E5A', roughness: 0.9, flatShading: true }),
  bush: new MeshStandardMaterial({ color: '#4E9A62', roughness: 0.9, flatShading: true }),
  mud: new MeshStandardMaterial({ color: '#C99A66', roughness: 1, flatShading: true }),
  mudDark: new MeshStandardMaterial({ color: '#A97B4C', roughness: 1, flatShading: true }),
  stone: new MeshStandardMaterial({ color: '#D9CBB3', roughness: 0.85, flatShading: true }),
  white: new MeshStandardMaterial({ color: '#E9E8EE', roughness: 0.6, flatShading: true }),
  glass: new MeshStandardMaterial({ color: '#2B3E66', roughness: 0.25, metalness: 0.4, flatShading: true }),
  glassTeal: new MeshStandardMaterial({ color: '#2F5D72', roughness: 0.3, metalness: 0.3, flatShading: true }),
  steel: new MeshStandardMaterial({ color: '#8C93A8', roughness: 0.4, metalness: 0.5, flatShading: true }),
  plaza: new MeshStandardMaterial({ color: '#F1E4CC', roughness: 0.95, flatShading: true }),
  lantern: new MeshBasicMaterial({ color: '#FFD08A' }),
  gold: new MeshStandardMaterial({ color: '#E3A83C', roughness: 0.35, metalness: 0.6, emissive: '#7A4E10', emissiveIntensity: 0.5 }),
};

export function Palm({ position = [0, 0, 0], scale = 1, seed = 'p' }: { position?: [number, number, number]; scale?: number; seed?: string }) {
  const rnd = useMemo(() => seeded(seed), [seed]);
  const lean = useMemo(() => (rnd() - 0.5) * 0.25, [rnd]);
  const turn = useMemo(() => rnd() * Math.PI, [rnd]);
  return (
    <group position={position} scale={scale} rotation-y={turn}>
      <mesh material={mats.trunk} position-y={0.22} rotation-z={lean} castShadow>
        <cylinderGeometry args={[0.018, 0.03, 0.44, 5]} />
      </mesh>
      <group position={[Math.sin(-lean) * 0.22, 0.45, 0]}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <mesh key={i} material={mats.frond} rotation={[0.9, (i / 6) * Math.PI * 2, 0]} position-y={0.0} castShadow>
            <coneGeometry args={[0.05, 0.26, 3]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

export function Bush({ position, s = 0.07 }: { position: [number, number, number]; s?: number }) {
  return (
    <mesh material={mats.bush} position={position} castShadow>
      <icosahedronGeometry args={[s, 0]} />
    </mesh>
  );
}

export function Lantern({ position }: { position: [number, number, number] }) {
  return (
    <mesh material={mats.lantern} position={position}>
      <boxGeometry args={[0.03, 0.045, 0.03]} />
    </mesh>
  );
}

export interface FaceSpec {
  /** Box centre and size the windows sit on. */
  center: [number, number, number];
  size: [number, number, number];
  floors: number;
  cols: number;
  /** Which faces get windows: +z, -z, +x, -x. */
  faces?: ('pz' | 'nz' | 'px' | 'nx')[];
  winW?: number;
  winH?: number;
  margin?: number;
}

/**
 * Lit windows on the faces of a box, as one instanced mesh. A few windows switch on and off at a time,
 * so the city feels lived in.
 */
export function Windows({ specs, seed, lit = 0.62, warm = WARM }: { specs: FaceSpec[]; seed: string; lit?: number; warm?: Color }) {
  const ref = useRef<InstancedMesh>(null);
  const { matrices, count } = useMemo(() => {
    const list: Matrix4[] = [];
    const o = new Object3D();
    for (const s of specs) {
      const [cx, cy, cz] = s.center;
      const [w, h, d] = s.size;
      const faces = s.faces ?? ['pz', 'px', 'nx', 'nz'];
      const margin = s.margin ?? 0.12;
      for (const f of faces) {
        const along = f === 'pz' || f === 'nz' ? w : d;
        const usable = along * (1 - margin * 2);
        const stepX = usable / s.cols;
        const usableH = h * 0.86;
        const stepY = usableH / s.floors;
        const winW = s.winW ?? stepX * 0.55;
        const winH = s.winH ?? stepY * 0.55;
        for (let fl = 0; fl < s.floors; fl++) {
          for (let c = 0; c < s.cols; c++) {
            const u = -usable / 2 + stepX * (c + 0.5);
            const y = cy - usableH / 2 + stepY * (fl + 0.5);
            o.rotation.set(0, 0, 0);
            if (f === 'pz') { o.position.set(cx + u, y, cz + d / 2 + 0.004); o.rotation.y = 0; }
            if (f === 'nz') { o.position.set(cx - u, y, cz - d / 2 - 0.004); o.rotation.y = Math.PI; }
            if (f === 'px') { o.position.set(cx + w / 2 + 0.004, y, cz - u); o.rotation.y = Math.PI / 2; }
            if (f === 'nx') { o.position.set(cx - w / 2 - 0.004, y, cz + u); o.rotation.y = -Math.PI / 2; }
            o.scale.set(winW, winH, 1);
            o.updateMatrix();
            list.push(o.matrix.clone());
          }
        }
      }
    }
    return { matrices: list, count: list.length };
  }, [specs]);

  const geom = useMemo(() => new PlaneGeometry(1, 1), []);
  const mat = useMemo(() => new MeshBasicMaterial({ toneMapped: false }), []);
  const state = useRef<boolean[]>([]);
  const rnd = useMemo(() => seeded(seed), [seed]);

  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    state.current = matrices.map(() => rnd() < lit);
    matrices.forEach((mx, i) => {
      m.setMatrixAt(i, mx);
      m.setColorAt(i, state.current[i] ? (rnd() < 0.3 ? WARM_SOFT : warm) : DIM);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [matrices, lit, rnd, warm]);

  const acc = useRef(0);
  useFrame((_, dt) => {
    const m = ref.current;
    if (!m || flight.reducedMotion || count === 0) return;
    acc.current += dt;
    if (acc.current < 0.35) return;
    acc.current = 0;
    for (let k = 0; k < 2; k++) {
      const i = Math.floor(Math.random() * count);
      state.current[i] = !state.current[i];
      m.setColorAt(i, state.current[i] ? warm : DIM);
    }
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geom, mat, count]} frustumCulled={false} />;
}

/** A soft dark disc under buildings, standing in for ambient occlusion. */
let aoTexture: CanvasTexture | null = null;
function getAoTexture() {
  if (aoTexture) return aoTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grd = g.createRadialGradient(32, 32, 4, 32, 32, 32);
  grd.addColorStop(0, 'rgba(20,14,30,0.55)');
  grd.addColorStop(1, 'rgba(20,14,30,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  aoTexture = new CanvasTexture(c);
  return aoTexture;
}

export function ContactAO({ size = [1, 1], position = [0, 0.004, 0] }: { size?: [number, number]; position?: [number, number, number] }) {
  const tex = useMemo(getAoTexture, []);
  return (
    <mesh position={position} rotation-x={-Math.PI / 2} renderOrder={3}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} />
    </mesh>
  );
}

/** A stepped Najdi crenellation along the top edge of a box: small triangles of mud. */
export function Crenellation({ width, depth, y, step = 0.09, material = mats.mud }: { width: number; depth: number; y: number; step?: number; material?: MeshStandardMaterial }) {
  const items = useMemo(() => {
    const out: { p: [number, number, number]; r: number }[] = [];
    const nx = Math.max(2, Math.floor(width / step));
    const nz = Math.max(2, Math.floor(depth / step));
    for (let i = 0; i < nx; i++) {
      const x = -width / 2 + (width / nx) * (i + 0.5);
      out.push({ p: [x, y, depth / 2 - 0.012], r: 0 });
      out.push({ p: [x, y, -depth / 2 + 0.012], r: 0 });
    }
    for (let i = 0; i < nz; i++) {
      const z = -depth / 2 + (depth / nz) * (i + 0.5);
      out.push({ p: [width / 2 - 0.012, y, z], r: Math.PI / 2 });
      out.push({ p: [-width / 2 + 0.012, y, z], r: Math.PI / 2 });
    }
    return out;
  }, [width, depth, y, step]);
  const ref = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new Object3D();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(0, it.r + Math.PI / 4, 0);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, material, items.length]} castShadow frustumCulled={false}>
      <coneGeometry args={[step * 0.4, step * 0.62, 4, 1]} />
    </instancedMesh>
  );
}
