/** Opening hours in Riyadh time, 24 h "HH:MM". A close earlier than the open runs past midnight. */
export interface Hours {
  open: string;
  close: string;
  /** Weekday overrides, 0 = Sunday ... 6 = Saturday: another window, or null when closed. */
  days?: Partial<Record<string, [string, string] | null>>;
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Riyadh is UTC+3 all year (no daylight saving), so its clock is a fixed shift from UTC. */
export function riyadhClock(now = new Date()) {
  const t = new Date(now.getTime() + 3 * 3600_000);
  return { day: t.getUTCDay(), minute: t.getUTCHours() * 60 + t.getUTCMinutes() };
}

/** The window for a weekday, or null when closed that day. */
export function windowOn(h: Hours, day: number): [string, string] | null {
  const o = h.days?.[String(day)];
  return o === undefined ? [h.open, h.close] : o;
}

/** The window open at this moment: today's, or yesterday's still running past midnight. */
export function openWindow(h: Hours, day: number, minute: number): [string, string] | null {
  const today = windowOn(h, day);
  if (today) {
    const o = minutes(today[0]);
    const c = minutes(today[1]);
    if (c > o ? minute >= o && minute < c : minute >= o) return today;
  }
  const before = windowOn(h, (day + 6) % 7);
  if (before && minutes(before[1]) <= minutes(before[0]) && minute < minutes(before[1])) return before;
  return null;
}

export function isOpenAt(h: Hours, day: number, minute: number): boolean {
  return openWindow(h, day, minute) !== null;
}

/** Splits "HH:MM" for the locale formatter. */
export function hourMinute(hhmm: string): [number, number] {
  const [h, m] = hhmm.split(':').map(Number);
  return [h, m];
}

/** The week in plain words, for the assistant: "daily 09:00–20:00; Friday 16:00–21:00". */
export function describeHours(h: Hours): string {
  const parts = [`daily ${h.open}–${h.close}`];
  for (let day = 0; day < 7; day++) {
    if (h.days?.[String(day)] === undefined) continue;
    const w = windowOn(h, day);
    parts.push(`${WEEKDAYS[day]} ${w ? `${w[0]}–${w[1]}` : 'closed'}`);
  }
  return parts.join('; ');
}
