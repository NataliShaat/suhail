// Values shared between the camera rig and the meshes every frame, outside React to avoid re-renders.
export const flight = {
  /** 0 = city overview, 1 = inside a downtown. Eased, written by the camera rig. */
  t: 0,
  /** Seconds since the downtown map finished arriving; drives the islands rising and the path drawing. */
  arrivedAt: -1,
  /** Clock time when the current downtown was entered (flyingIn started). */
  enteredAt: -1,
  reducedMotion: false,
};

export const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const easeOutBack = (x: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
};
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Small deterministic random from a string, so islands keep their shape between renders. */
export function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
