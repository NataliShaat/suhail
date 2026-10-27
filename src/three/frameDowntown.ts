import { PerspectiveCamera, Vector3 } from 'three';
import type { Downtown, HotelKind } from '../data';
import { HOME_RADIUS, HOTEL_SCALE, PLACE_RADIUS, type MapLayout } from '../data/geo';
import { CAMERA_FOV } from './fit';
import { ISLAND_TOP } from './Island';

/**
 * The downtown view, composed on the phone screen first and then placed in the world:
 *
 * 1. The camera is solved so the hotel's island spans most of the screen width and rests just above
 *    the "Book a guide" button, facing the viewer.
 * 2. Every place, station and label gets a box in the free space above the island, keeping the real
 *    order around the hotel (left to right, near to far). Boxes are pushed apart until none overlap,
 *    none touch a screen edge and none sit on the hotel building.
 * 3. Each box is projected back onto the ground, which gives the island's position in the world.
 */

export interface Chrome {
  /** Bottom of the header (title, progress, filter chips), in CSS pixels. */
  headerBottom: number;
  /** Top of the "Book a guide" button, in CSS pixels. */
  buttonTop: number;
}

export interface LabelSize {
  w: number;
  h: number;
}

export interface Framing {
  position: Vector3;
  target: Vector3;
  layout: MapLayout;
  /** Where each label landed on screen, for checks. */
  labels?: { id: string; x0: number; x1: number; y0: number; y1: number }[];
  landmarks?: unknown;
}

/**
 * The camera's look, in radians below horizontal: about 50°, a raised view down onto the island
 * (not top-down). The distance is solved from ISLAND_WIDTH, so the island keeps its size on screen.
 */
const TILT = 0.87;
/** Share of the screen width the hotel island spans. */
// Measured across the island centre; its wobbling outline reaches a little wider, about 80% of the screen.
// Scaled down with HOTEL_SCALE, so the camera distance stays where it was and only the island shrinks.
const ISLAND_WIDTH = 0.72;
/** Space between the island's front edge and the guide button, in CSS pixels. */
const ISLAND_GAP = 16;
/** Every island stands at least this share of the hotel island's radius behind the hotel's centre. */
const BEHIND_SHARE = 0.45;
/** No label comes closer than this to any screen edge. */
const EDGE = 12;
/** Space kept between any two labels, island footprints included. */
const LABEL_GAP = 12;
/** Grid the labels are placed on, in CSS pixels. */
const STEP = 5;
/** Open ground between two neighbouring islands, in world units. */
const ISLAND_SPACING = 0.55;

const BADGE_Y = ISLAND_TOP + 0.95; // place badges float this high over their island
const METRO_Y = 0.5;
const ZONE_Y = 0.1;

/** Footprint of each hotel's buildings on its island (x from, x to, height), before scaling. */
const BUILDING: Record<HotelKind, { x0: number; x1: number; h: number }> = {
  ramada: { x0: -0.42, x1: 0.42, h: 3.25 },
  babsamhan: { x0: -1.0, x1: 1.0, h: 1.1 },
  comfort: { x0: -0.45, x1: 1.15, h: 3.15 },
};

interface Item {
  id: string;
  kind: 'place' | 'metro' | 'zone';
  w: number;
  h: number;
  /** Extra box below the label, covering the island under a place badge. */
  below: number;
  x: number;
  y: number;
  /** Plane the label sits on, for projecting back to the ground. */
  planeY: number;
}

/** The narrowest the hotel island may get while the camera steps back to make room for every label. */
const MIN_ISLAND_WIDTH = 0.56;

export function frameDowntown(
  d: Downtown,
  base: MapLayout,
  origin: Vector3,
  view: { width: number; height: number },
  chrome: Chrome,
  labelSize: (id: string, kind: Item['kind']) => LabelSize,
  zoneId: string | null,
): Framing {
  // Keep the chosen framing when everything fits; otherwise step the camera back a little at a time.
  // While stepping back, a placing order is dropped at its first label without room. Only at the last
  // step may labels sit over the top of the tower, and the least-bad order wins.
  let f = compose(d, base, origin, view, chrome, labelSize, zoneId, ISLAND_WIDTH, false);
  for (let w = ISLAND_WIDTH - 0.03; f.fails > 0 && w >= MIN_ISLAND_WIDTH - 1e-6; w -= 0.03) {
    f = compose(d, base, origin, view, chrome, labelSize, zoneId, w, false);
  }
  if (f.fails > 0) f = compose(d, base, origin, view, chrome, labelSize, zoneId, MIN_ISLAND_WIDTH, true);
  if (f.fails > 0 && import.meta.env?.DEV) console.warn('[framing] labels without room:', f.fails, d.id);
  return f;
}

function compose(
  d: Downtown,
  base: MapLayout,
  origin: Vector3,
  view: { width: number; height: number },
  chrome: Chrome,
  labelSize: (id: string, kind: Item['kind']) => LabelSize,
  zoneId: string | null,
  islandWidth: number,
  lastResort: boolean,
): Framing & { fails: number } {
  const { width: W, height: H } = view;
  const cam = new PerspectiveCamera(CAMERA_FOV, W / H, 0.5, 400);
  const dir = new Vector3(0, Math.sin(TILT), Math.cos(TILT));
  const R = HOME_RADIUS;
  const top = ISLAND_TOP * HOTEL_SCALE;
  const v = new Vector3();
  const toPx = (p: Vector3) => {
    v.copy(p).project(cam);
    return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H };
  };
  const place = (target: Vector3, dist: number) => {
    cam.position.copy(target).addScaledVector(dir, dist);
    cam.lookAt(target);
    cam.updateMatrixWorld();
  };

  // 1. The camera. For a distance, slide the target until the island's front edge sits on its line;
  //    then pick the distance at which the island spans the chosen width.
  const islandBottom = chrome.buttonTop - ISLAND_GAP;
  const front = new Vector3(origin.x, 0, origin.z + R * 1.04);
  const target = new Vector3(origin.x, 0, origin.z);
  const settle = (dist: number) => {
    // The camera must stay in front of (south of) the island's front edge, or the edge projects from
    // behind it and the search runs away.
    let lo = origin.z + R + 1 - dist * Math.cos(TILT);
    let hi = origin.z + R;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      target.set(origin.x, 0, mid);
      place(target, dist);
      // Moving the target north lowers the island on screen.
      if (toPx(front).y > islandBottom) lo = mid;
      else hi = mid;
    }
    const l = toPx(new Vector3(origin.x - R, top, origin.z));
    const r = toPx(new Vector3(origin.x + R, top, origin.z));
    return r.x - l.x;
  };
  let dLo = 3;
  let dHi = 120;
  for (let i = 0; i < 40; i++) {
    const mid = (dLo + dHi) / 2;
    if (settle(mid) > W * islandWidth) dLo = mid;
    else dHi = mid;
  }
  settle(dHi);
  const position = cam.position.clone();
  const finalTarget = target.clone();

  // Screen landmarks of the hotel.
  const centre = toPx(new Vector3(origin.x, top, origin.z));
  const back = toPx(new Vector3(origin.x, top, origin.z - R));
  const b = BUILDING[d.hotel.kind];
  const bTop = toPx(new Vector3(origin.x, b.h * HOTEL_SCALE, origin.z));
  const bL = toPx(new Vector3(origin.x + b.x0 * HOTEL_SCALE, top, origin.z + 0.4));
  const bR = toPx(new Vector3(origin.x + b.x1 * HOTEL_SCALE, top, origin.z + 0.4));
  const building = { x0: bL.x - 6, x1: bR.x + 6, y0: bTop.y - 6, y1: back.y };

  // A place island's footprint on screen, measured just behind the hotel: its badge floats above it,
  // so each place's box covers the badge and the island under it, and islands never touch.
  const refZ = origin.z - R - 1;
  const refBadge = toPx(new Vector3(origin.x, BADGE_Y, refZ));
  const refL = toPx(new Vector3(origin.x - PLACE_RADIUS, ISLAND_TOP, refZ));
  const refR = toPx(new Vector3(origin.x + PLACE_RADIUS, ISLAND_TOP, refZ));
  const refFront = toPx(new Vector3(origin.x, 0, refZ + PLACE_RADIUS));
  const islandW = refR.x - refL.x;

  const yMin = chrome.headerBottom + EDGE;
  // Place islands may tuck a little behind the hotel island's back rim; their badges stay clear of it.
  const yMax = back.y + 22;

  // 2. Boxes in screen space, in the real order around the hotel.
  const others = Object.entries(base.nodes).filter(([id]) => id !== 'hotel');
  const behind = -Math.PI / 2;
  const angles = others.map(([, n]) => Math.atan2(Math.sin(Math.atan2(n.z, n.x) - behind), Math.cos(Math.atan2(n.z, n.x) - behind)));
  const dists = others.map(([, n]) => Math.hypot(n.x, n.z));
  const maxPhi = Math.max(0.3, ...angles.map(Math.abs));
  const dMin = Math.min(...dists);
  const dMax = Math.max(...dists);
  const spanX = W / 2 - EDGE - 30;
  const spanY = centre.y - yMin - 30;

  const items: Item[] = others.map(([id], i) => {
    const kind: Item['kind'] = d.metro.some((m) => m.id === id) || id === 'no-metro' ? 'metro' : 'place';
    const size = labelSize(id, kind);
    const phi = (angles[i] / maxPhi) * 1.25; // -1.25 .. 1.25 rad: from the left side, over the top, to the right
    const dn = dMax > dMin ? (dists[i] - dMin) / (dMax - dMin) : 0.5;
    const rx = spanX * (0.72 + 0.28 * dn);
    const ry = spanY * (0.5 + 0.5 * dn);
    return {
      id,
      kind,
      w: kind === 'place' ? Math.max(size.w, islandW) : size.w,
      h: size.h,
      below: kind === 'place' ? Math.max(18, refFront.y - refBadge.y - size.h / 2) : 0,
      x: W / 2 + Math.sin(phi) * rx,
      y: centre.y - Math.cos(phi) * ry,
      planeY: kind === 'place' ? BADGE_Y : METRO_Y,
    };
  });
  const box = (it: Item, x = it.x, y = it.y) => ({ x0: x - it.w / 2, x1: x + it.w / 2, y0: y - it.h / 2, y1: y + it.h / 2 + it.below });
  const hits = (p: ReturnType<typeof box>, q: { x0: number; x1: number; y0: number; y1: number }, gap: number) =>
    p.x0 < q.x1 + gap && q.x0 < p.x1 + gap && p.y0 < q.y1 + gap && q.y0 < p.y1 + gap;

  // 3. Back to the world: the label's screen point, met on the plane it floats at. The camera is fixed
  //    by now, so the ray through a pixel is built from its axes directly (this runs for every cell).
  const eye = cam.position.clone();
  const fwd = new Vector3().setFromMatrixColumn(cam.matrixWorld, 2).negate();
  const halfY = Math.tan((CAMERA_FOV * Math.PI) / 360);
  const right = new Vector3().setFromMatrixColumn(cam.matrixWorld, 0).multiplyScalar(halfY * (W / H));
  const up = new Vector3().setFromMatrixColumn(cam.matrixWorld, 1).multiplyScalar(halfY);
  const toWorld = (it: Item, x: number, y: number) => {
    const nx = (x / W) * 2 - 1;
    const ny = 1 - (y / H) * 2;
    const dy = fwd.y + right.y * nx + up.y * ny;
    const t = (it.planeY - eye.y) / dy;
    if (!(t > 0)) return null;
    return {
      x: eye.x + (fwd.x + right.x * nx + up.x * ny) * t - origin.x,
      z: eye.z + (fwd.z + right.z * nx + up.z * ny) * t - origin.z,
    };
  };

  // Each label takes the free spot nearest to where it would like to be: on screen, clear of every
  // label already placed, the screen edges and the hotel's buildings, and with its island clear of
  // the hotel's island in the world. Several placing orders are tried; the first in which every label
  // finds room wins. Only as a last resort may a label sit over the very top of a tower.
  type Spot = { x: number; y: number; p: { x: number; z: number } };
  const want = new Map(items.map((it) => [it.id, { x: it.x, y: it.y }]));
  const zoneItem = (spots: Map<string, Spot>): Item | null => {
    if (!zoneId || !d.bonus) return null;
    const members = items.filter((it) => d.bonus!.places.some((p) => p.id === it.id));
    const size = labelSize(zoneId, 'zone');
    const cx = members.reduce((s, it) => s + spots.get(it.id)!.x, 0) / members.length;
    const cy = Math.max(...members.map((it) => spots.get(it.id)!.y + it.h / 2 + it.below));
    return { id: zoneId, kind: 'zone', w: size.w, h: size.h, below: 0, x: cx, y: cy + size.h / 2 + 4, planeY: ZONE_Y };
  };

  // Free cells for a label, nearest to where it would like to be first, with the checks that never
  // change between attempts (on screen, clear of the hotel's island, behind it) already applied.
  const cells = new Map<string, Spot[]>();
  const candidates = (it: Item, pref: { x: number; y: number }, extra: number) => {
    const key = `${it.id}|${extra}|${pref.x}|${pref.y}`;
    let list = cells.get(key);
    if (list) return list;
    const clear = R + (it.kind === 'place' ? PLACE_RADIUS : 0.45) + 0.3;
    const found: (Spot & { cost: number })[] = [];
    const yHi = yMax + extra - it.h / 2 - it.below;
    for (let y = yMin + it.h / 2; y <= yHi; y += STEP) {
      for (let x = EDGE + it.w / 2; x <= W - EDGE - it.w / 2; x += STEP) {
        const p = toWorld(it, x, y);
        if (!p) continue;
        // Around and behind the hotel, never level with it or in front: routes then never cross it.
        if (it.kind !== 'zone' && (Math.hypot(p.x, p.z) < clear || p.z > -R * BEHIND_SHARE)) continue;
        const dx = x - pref.x;
        const dy = y - pref.y;
        found.push({ x, y, p, cost: dx * dx * 1.4 + dy * dy });
      }
    }
    list = found.sort((a, b) => a.cost - b.cost);
    cells.set(key, list);
    return list;
  };

  const attempt = (order: Item[], towerTrim: number) => {
    const placed: ReturnType<typeof box>[] = [];
    const grounds: { x: number; z: number; r: number }[] = [];
    const spots = new Map<string, Spot>();
    const tower = { ...building, y0: building.y0 + towerTrim };
    let fails = 0;
    const settle = (it: Item) => {
      const pref = want.get(it.id) ?? { x: it.x, y: it.y };
      const own = it.kind === 'place' ? PLACE_RADIUS : 0.45;
      let best: Spot | null = null;
      for (const extra of [0, 30, 60]) {
        for (const c of candidates(it, pref, extra)) {
          const bx = box(it, c.x, c.y);
          if (it.kind !== 'zone' && hits(bx, tower, 0)) continue;
          if (placed.some((q) => hits(bx, q, LABEL_GAP))) continue;
          if (it.kind !== 'zone' && grounds.some((q) => Math.hypot(c.p.x - q.x, c.p.z - q.z) < own + q.r + ISLAND_SPACING)) continue;
          best = c;
          break;
        }
        if (best) break;
      }
      if (!best) {
        fails++;
        best = { x: pref.x, y: pref.y, p: toWorld(it, pref.x, pref.y) ?? { x: 0, z: -R - 2 } };
      }
      placed.push(box(it, best.x, best.y));
      if (it.kind !== 'zone') grounds.push({ ...best.p, r: own });
      spots.set(it.id, best);
    };
    for (const it of order) {
      settle(it);
      if (fails && !lastResort) return { spots, fails, zone: null };
    }
    const zone = zoneItem(spots);
    if (zone) {
      want.set(zone.id, { x: zone.x, y: zone.y });
      settle(zone);
    }
    return { spots, fails, zone };
  };

  const isMetro = (it: Item) => (it.kind === 'metro' ? 1 : 0);
  const out = (it: Item) => Math.abs(it.x - W / 2);
  const orders = [
    [...items].sort((p, q) => isMetro(q) - isMetro(p) || out(q) - out(p)), // stations, then outside in
    [...items].sort((p, q) => isMetro(q) - isMetro(p) || out(p) - out(q)), // stations, then inside out
    [...items].sort((p, q) => isMetro(q) - isMetro(p) || p.y - q.y), // stations, then top down
    [...items].sort((p, q) => q.y - p.y), // bottom up
    [...items].sort((p, q) => isMetro(q) - isMetro(p) || q.y - p.y), // stations, then bottom up
    [...items].sort((p, q) => p.x - q.x), // left to right
    [...items].sort((p, q) => q.x - p.x), // right to left
  ];
  let result = attempt(orders[0], 0);
  search: for (const trim of lastResort ? [0, 40, 80, 120] : [0]) {
    for (const o of orders) {
      const r = attempt(o, trim);
      if (r.fails < result.fails) result = r;
      if (r.fails === 0) break search;
    }
  }
  if (result.zone) items.push(result.zone);
  const world: Record<string, { x: number; z: number }> = {};
  for (const it of items) {
    const sp = result.spots.get(it.id);
    if (!sp) continue;
    it.x = sp.x;
    it.y = sp.y;
    world[it.id] = sp.p;
  }

  const nodes: MapLayout['nodes'] = { hotel: { x: 0, z: 0 }, ...world };
  const bounds = { minX: -R, maxX: R, minZ: -R, maxZ: R };
  for (const n of Object.values(nodes)) {
    bounds.minX = Math.min(bounds.minX, n.x);
    bounds.maxX = Math.max(bounds.maxX, n.x);
    bounds.minZ = Math.min(bounds.minZ, n.z);
    bounds.maxZ = Math.max(bounds.maxZ, n.z);
  }
  return { fails: result.fails, position, target: finalTarget, layout: { nodes, bounds }, labels: items.map((it) => ({ id: it.id, ...box(it) })), landmarks: { centre, back, building, yMin, yMax } };
}
