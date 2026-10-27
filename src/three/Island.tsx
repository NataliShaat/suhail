import { useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  ExtrudeGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Shape,
  ShapeGeometry,
} from 'three';
import { seeded } from './sceneState';

export const ISLAND_TOP = 0.42;
const ISLAND_DEPTH = 0.9;

function blobShape(radius: number, seed: string, wobble = 1) {
  const rnd = seeded(seed);
  const p1 = rnd() * Math.PI * 2;
  const p2 = rnd() * Math.PI * 2;
  const p3 = rnd() * Math.PI * 2;
  const a1 = (0.05 + rnd() * 0.05) * wobble;
  const a2 = (0.03 + rnd() * 0.04) * wobble;
  const a3 = (0.015 + rnd() * 0.02) * wobble;
  const n = 48;
  const shape = new Shape();
  for (let i = 0; i <= n; i++) {
    const th = (i / n) * Math.PI * 2;
    const r = radius * (1 + a1 * Math.sin(2 * th + p1) + a2 * Math.sin(3 * th + p2) + a3 * Math.sin(5 * th + p3));
    const x = Math.cos(th) * r;
    const y = Math.sin(th) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  return shape;
}

const geometryCache = new Map<string, { body: ExtrudeGeometry; ring: ShapeGeometry; halo: ShapeGeometry }>();

function islandGeometry(radius: number, seed: string) {
  const key = `${radius}|${seed}`;
  const hit = geometryCache.get(key);
  if (hit) return hit;
  const body = new ExtrudeGeometry(blobShape(radius, seed), {
    depth: ISLAND_DEPTH,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.07,
    bevelSegments: 2,
    curveSegments: 1,
  });
  body.rotateX(-Math.PI / 2);
  body.translate(0, ISLAND_TOP - ISLAND_DEPTH - 0.07, 0);
  body.computeVertexNormals();
  const ring = new ShapeGeometry(blobShape(radius * 1.13, seed), 1);
  ring.rotateX(-Math.PI / 2);
  const halo = new ShapeGeometry(blobShape(radius * 1.42, seed, 0.6), 1);
  halo.rotateX(-Math.PI / 2);
  const out = { body, ring, halo };
  geometryCache.set(key, out);
  return out;
}

interface IslandProps {
  radius: number;
  seed: string;
  glow: string;
  top?: string;
  side?: string;
  /** 0..1, how lit the island is. Unvisited places sit lower. */
  vivid?: number;
  children?: ReactNode;
  onClick?: () => void;
}

/** A raised diorama tile on the night sea, its edge glowing in its district colour. */
export function Island({ radius, seed, glow, top = '#E6D3B3', side = '#9C7A55', vivid = 1, children, onClick }: IslandProps) {
  const geo = islandGeometry(radius, seed);
  const mats = useMemo(() => {
    const topMat = new MeshStandardMaterial({ color: top, roughness: 0.92, flatShading: true });
    const sideMat = new MeshStandardMaterial({ color: side, roughness: 1, flatShading: true });
    const ring = new MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending });
    const halo = new MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.22, depthWrite: false, blending: AdditiveBlending });
    return { topMat, sideMat, ring, halo };
  }, [top, side, glow]);

  const baseTop = useMemo(() => new Color(top), [top]);
  const dimTop = useMemo(() => new Color(top).lerp(new Color('#6E6A86'), 0.45), [top]);
  const ringRef = useRef<Mesh>(null);
  const vividRef = useRef(vivid);
  vividRef.current = vivid;
  const shown = useRef(vivid);

  useFrame((state, dt) => {
    shown.current += (vividRef.current - shown.current) * Math.min(1, dt * 4);
    const v = shown.current;
    mats.topMat.color.copy(dimTop).lerp(baseTop, v);
    const breathe = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 1.4 + radius * 10);
    mats.ring.opacity = (0.35 + 0.5 * v) * (0.85 + 0.15 * breathe);
    mats.halo.opacity = (0.08 + 0.16 * v) * (0.8 + 0.2 * breathe);
  });

  return (
    <group>
      <mesh geometry={geo.halo} material={mats.halo} position-y={0.03} renderOrder={1} />
      <mesh ref={ringRef} geometry={geo.ring} material={mats.ring} position-y={0.05} renderOrder={2} />
      <mesh
        geometry={geo.body}
        material={[mats.topMat, mats.sideMat]}
        castShadow
        receiveShadow
        onClick={
          onClick
            ? (e) => {
                e.stopPropagation();
                onClick();
              }
            : undefined
        }
      />
      <group position-y={ISLAND_TOP}>{children}</group>
    </group>
  );
}
