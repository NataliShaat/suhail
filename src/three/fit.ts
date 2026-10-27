import { PerspectiveCamera, Vector3 } from 'three';

export interface Safe {
  /** Fractions of the screen kept clear of the content (top bar, bottom controls, sides). */
  top: number;
  bottom: number;
  side: number;
}

/** A point to keep on screen, optionally with an HTML label around it (half-sizes in CSS pixels). */
export interface FitPoint {
  p: Vector3;
  halfW?: number;
  /** Uneven label extents, left and right of the point (override halfW). */
  padL?: number;
  padR?: number;
  halfH?: number;
  /** Where the label sits relative to the point, in CSS pixels (+y is down the screen). */
  offsetY?: number;
}

export const CAMERA_FOV = 36;

/**
 * Finds a camera position and target that frame every point (and every label's full width) inside
 * the safe area of the screen, looking down at `tilt` radians from horizontal, from the south (+z).
 */
export function fitCamera(input: (Vector3 | FitPoint)[], view: { width: number; height: number }, tilt: number, safe: Safe) {
  const points: FitPoint[] = input.map((x) => (x instanceof Vector3 ? { p: x } : x));
  const aspect = view.width / view.height;
  const cam = new PerspectiveCamera(CAMERA_FOV, aspect, 0.1, 500);
  const dir = new Vector3(0, Math.sin(tilt), Math.cos(tilt));
  const target = new Vector3();
  points.forEach((x) => target.add(x.p));
  target.multiplyScalar(1 / points.length);
  target.y = 0;

  // Pixels to normalised device units.
  const nx = 2 / view.width;
  const ny = 2 / view.height;
  const safeW = 2 - safe.side * 4;
  const safeH = 2 - (safe.top + safe.bottom) * 2;
  const safeCy = safe.bottom - safe.top;
  const v = new Vector3();
  // Shrinks label padding only if the labels alone could never fit side by side.
  let padScale = 1;

  const project = (d: number) => {
    cam.position.copy(target).addScaledVector(dir, d);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const x of points) {
      v.copy(x.p).project(cam);
      const pl = (x.padL ?? x.halfW ?? 0) * nx * padScale;
      const pr = (x.padR ?? x.halfW ?? 0) * nx * padScale;
      const hh = (x.halfH ?? 0) * ny * padScale;
      const cy = v.y - (x.offsetY ?? 0) * ny;
      minX = Math.min(minX, v.x - pl); maxX = Math.max(maxX, v.x + pr);
      minY = Math.min(minY, cy - hh); maxY = Math.max(maxY, cy + hh);
    }
    return { minX, maxX, minY, maxY };
  };

  for (;;) {
    const far = project(400);
    if ((far.maxX - far.minX <= safeW && far.maxY - far.minY <= safeH) || padScale <= 0.1) break;
    padScale -= 0.1;
  }

  let d = 20;
  for (let iter = 0; iter < 6; iter++) {
    let lo = 2;
    let hi = 200;
    for (let i = 0; i < 28; i++) {
      const mid = (lo + hi) / 2;
      const b = project(mid);
      if (b.maxX - b.minX <= safeW && b.maxY - b.minY <= safeH) hi = mid;
      else lo = mid;
    }
    d = hi;
    const b = project(d);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;
    // Visible half-extent at the target distance, used to turn the NDC error into a world shift.
    const halfH = Math.tan((CAMERA_FOV * Math.PI) / 360) * d;
    const halfW = halfH * aspect;
    target.x += cx * halfW;
    target.z -= ((cy - safeCy) * halfH) / Math.sin(tilt);
  }
  const position = target.clone().addScaledVector(dir, d);
  return { position, target };
}

let ctx: CanvasRenderingContext2D | null = null;
/** Width of a line of text in CSS pixels, for sizing labels before they render. */
export function textWidth(text: string, font: string) {
  ctx ??= document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * 8;
  ctx.font = font;
  return ctx.measureText(text).width;
}
