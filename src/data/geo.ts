import { DOWNTOWNS, type Downtown } from './index';

const M_PER_DEG_LAT = 110574;

/** Metres east and north of an origin, equirectangular (fine at city scale). */
export function offsetMeters(lat: number, lng: number, lat0: number, lng0: number) {
  const east = (lng - lng0) * Math.cos((lat0 * Math.PI) / 180) * 111320;
  const north = (lat - lat0) * M_PER_DEG_LAT;
  return { east, north };
}

export function distanceMeters(lat: number, lng: number, lat0: number, lng0: number) {
  const { east, north } = offsetMeters(lat, lng, lat0, lng0);
  return Math.hypot(east, north);
}

/** Square-root radial compression: keeps every bearing true, pulls far places in. World x = east, z = south. */
function compress(east: number, north: number, unitsPerSqrtKm: number) {
  const r = Math.hypot(east, north) / 1000;
  if (r === 0) return { x: 0, z: 0 };
  const rr = unitsPerSqrtKm * Math.sqrt(r);
  return { x: (east / 1000 / r) * rr, z: (-north / 1000 / r) * rr };
}

interface Node { id: string; x: number; z: number; radius: number; fixed?: boolean }

/** Pushes overlapping islands apart while keeping each close to its true bearing. */
function relax(nodes: Node[], gap: number, iterations = 120) {
  for (let it = 0; it < iterations; it++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        let d = Math.hypot(dx, dz);
        const min = a.radius + b.radius + gap;
        if (d >= min) continue;
        if (d < 1e-4) {
          // Same coordinate: split along a stable direction derived from the ids.
          const ang = ((i * 7 + j * 13) % 360) * (Math.PI / 180);
          dx = Math.cos(ang);
          dz = Math.sin(ang);
          d = 1;
        }
        const push = (min - d) / 2;
        const ux = dx / d;
        const uz = dz / d;
        if (a.fixed && b.fixed) continue;
        if (a.fixed) { b.x += ux * push * 2; b.z += uz * push * 2; }
        else if (b.fixed) { a.x -= ux * push * 2; a.z -= uz * push * 2; }
        else { a.x -= ux * push; a.z -= uz * push; b.x += ux * push; b.z += uz * push; }
      }
    }
  }
}

export const CITY_ISLAND_RADIUS = 1.75;
/** Inside a downtown the hotel's island grows to this scale: it is the hero of the screen. */
export const HOTEL_SCALE = 1.4;
export const HOME_RADIUS = CITY_ISLAND_RADIUS * HOTEL_SCALE;
export const PLACE_RADIUS = 0.62;

export interface MapLayout {
  nodes: Record<string, { x: number; z: number }>;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

const TAU = Math.PI * 2;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** World angle of a direction: x east, z south. The camera looks from +z, so "behind" is -z. */
const bearing = (east: number, north: number) => Math.atan2(-north, east);
const BEHIND = -Math.PI / 2;
/** Half-width of the fan the places spread over, measured from straight behind the hotel. */
const FAN = (70 * Math.PI) / 180;
/** The fan is a little narrower than it is deep, so a portrait screen holds it with the hotel large. */
const X_SQUEEZE = 0.5;

/**
 * Positions of every place and metro station around the hotel, relative to the hotel island centre.
 *
 * The hotel stands in front, facing the viewer, and the places fan out around and behind it. Their
 * order around the hotel is the real one: the map is turned so the widest empty direction faces the
 * camera, then that empty wedge is opened up so nothing stands between the viewer and the hotel.
 * Distances keep their order too (square-root compressed).
 */
export function downtownLayout(d: Downtown, mirror: boolean): MapLayout {
  const { lat: lat0, lng: lng0 } = d.hotel;
  const km = (lat: number, lng: number) => distanceMeters(lat, lng, lat0, lng0) / 1000;
  const angleOf = (lat: number, lng: number) => {
    const o = offsetMeters(lat, lng, lat0, lng0);
    return bearing(o.east, o.north);
  };
  const farKm = Math.max(...d.places.map((p) => km(p.lat, p.lng)));

  // Every direction that holds something: places, the bonus zone as one item, metro stations.
  const bonusCentre = d.bonus
    ? {
        lat: d.bonus.places.reduce((s, p) => s + p.lat, 0) / d.bonus.places.length,
        lng: d.bonus.places.reduce((s, p) => s + p.lng, 0) / d.bonus.places.length,
      }
    : null;
  const angles = [
    ...d.places.map((p) => angleOf(p.lat, p.lng)),
    ...d.metro.map((m) => angleOf(m.lat, m.lng)),
    ...(bonusCentre ? [angleOf(bonusCentre.lat, bonusCentre.lng)] : []),
  ].sort((a, b) => a - b);

  // The widest empty wedge, and its centre.
  let gap = 0;
  let gapCentre = Math.PI / 2;
  angles.forEach((a, i) => {
    const next = i === angles.length - 1 ? angles[0] + TAU : angles[i + 1];
    if (next - a > gap) {
      gap = next - a;
      gapCentre = a + gap / 2;
    }
  });
  const turn = Math.PI / 2 - gapCentre; // the empty wedge now faces the camera (+z)
  const occupied = Math.max(1e-3, Math.PI - gap / 2); // half-width of the occupied arc, around "behind"

  /** Turned, then squeezed into the fan behind the hotel. */
  const fanAngle = (a: number) => {
    const phi = wrap(a + turn - BEHIND);
    return BEHIND + (phi / occupied) * FAN;
  };
  const r0 = HOME_RADIUS + PLACE_RADIUS + 0.75;
  const r1 = r0 + 5.2;
  const radiusOf = (k: number) => r0 + (r1 - r0) * Math.sqrt(Math.min(1, k / farKm));
  const place = (ang: number, r: number) => ({ x: Math.cos(ang) * r * X_SQUEEZE, z: Math.sin(ang) * r });

  const nodes: Node[] = [{ id: 'hotel', x: 0, z: 0, radius: HOME_RADIUS + 0.2, fixed: true }];
  for (const p of d.places) {
    nodes.push({ id: p.id, ...place(fanAngle(angleOf(p.lat, p.lng)), radiusOf(km(p.lat, p.lng))), radius: PLACE_RADIUS });
  }
  relax(nodes, 0.5);

  let maxR = 0;
  for (const n of nodes) maxR = Math.max(maxR, Math.hypot(n.x, n.z));

  // A far bonus zone is drawn as an inset just past the main map, in its fanned direction (the copy
  // states its real distance), keeping its own inner shape.
  if (d.bonus && bonusCentre) {
    const c = place(fanAngle(angleOf(bonusCentre.lat, bonusCentre.lng)), maxR + 1.2);
    const cO = offsetMeters(bonusCentre.lat, bonusCentre.lng, lat0, lng0);
    for (const p of d.bonus.places) {
      const o = offsetMeters(p.lat, p.lng, lat0, lng0);
      const dx = (o.east - cO.east) / 1000;
      const dz = -(o.north - cO.north) / 1000;
      const rx = dx * Math.cos(turn) - dz * Math.sin(turn);
      const rz = dx * Math.sin(turn) + dz * Math.cos(turn);
      nodes.push({ id: p.id, x: c.x + rx * 4, z: c.z + rz * 4, radius: PLACE_RADIUS });
    }
    relax(nodes, 0.5);
  }

  // Metro stations stand on the edge of the map, on their side of the hotel. Two on one side are
  // staggered in depth so their chips never overlap. The chips run outward, to the screen's edge.
  const perSide = { [-1]: 0, [1]: 0 } as Record<number, number>;
  const metroNodes: Node[] = d.metro.map((m) => {
    const phi = wrap(fanAngle(angleOf(m.lat, m.lng)) - BEHIND);
    const side = phi < 0 ? -1 : 1;
    const k = perSide[side]++;
    const ang = BEHIND + side * FAN;
    // The radius covers the station chip, so it never sits on a place badge.
    return { id: m.id, ...place(ang, HOME_RADIUS + 1.6 + k * 2.6), radius: 1.0 };
  });
  // A downtown without a metro shows a "ride with a Rafeeq" chip where a station would stand.
  if (d.noMetroHint) {
    const side = perSide[1] <= perSide[-1] ? 1 : -1;
    metroNodes.push({ id: 'no-metro', ...place(BEHIND + side * FAN, HOME_RADIUS + 1.6), radius: 1.0 });
  }
  const all = [...nodes.map((n) => ({ ...n, fixed: true })), ...metroNodes];
  relax(all, 0.4);

  const out: MapLayout['nodes'] = {};
  const bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const n of all) {
    const x = mirror ? -n.x : n.x;
    out[n.id] = { x, z: n.z };
    bounds.minX = Math.min(bounds.minX, x - n.radius);
    bounds.maxX = Math.max(bounds.maxX, x + n.radius);
    bounds.minZ = Math.min(bounds.minZ, n.z - n.radius);
    bounds.maxZ = Math.max(bounds.maxZ, n.z + n.radius);
  }
  return { nodes: out, bounds };
}


/**
 * Overview positions of the three hotel islands. True bearings, square-root distances, then the whole
 * set turned so the long north-west to south-east spread runs down the portrait screen.
 */
function cityLayout() {
  const lat0 = DOWNTOWNS.reduce((s, d) => s + d.hotel.lat, 0) / DOWNTOWNS.length;
  const lng0 = DOWNTOWNS.reduce((s, d) => s + d.hotel.lng, 0) / DOWNTOWNS.length;
  const nodes: Node[] = DOWNTOWNS.map((d) => {
    const o = offsetMeters(d.hotel.lat, d.hotel.lng, lat0, lng0);
    return { id: d.id, ...compress(o.east, o.north, 1.5), radius: CITY_ISLAND_RADIUS };
  });
  // Rotate so the farthest pair runs top to bottom, tilted 8 degrees for a livelier diagonal.
  let a = nodes[0];
  let b = nodes[1];
  let best = 0;
  for (const p of nodes) for (const q of nodes) {
    const dd = Math.hypot(p.x - q.x, p.z - q.z);
    if (dd > best) { best = dd; a = p.z < q.z ? p : q; b = p.z < q.z ? q : p; }
  }
  const current = Math.atan2(b.z - a.z, b.x - a.x);
  const target = Math.PI / 2 - (8 * Math.PI) / 180;
  const rot = target - current;
  for (const n of nodes) {
    const x = n.x * Math.cos(rot) - n.z * Math.sin(rot);
    const z = n.x * Math.sin(rot) + n.z * Math.cos(rot);
    n.x = x;
    n.z = z;
  }
  // The glowing ring reaches about 1.25 radii and each label hangs below its island: leave room for both.
  relax(nodes, 2.4);
  const cx = nodes.reduce((s, n) => s + n.x, 0) / nodes.length;
  const cz = nodes.reduce((s, n) => s + n.z, 0) / nodes.length;
  const out: Record<string, [number, number]> = {};
  for (const n of nodes) out[n.id] = [n.x - cx, n.z - cz];
  return out;
}

export const CITY_POSITIONS = cityLayout();
