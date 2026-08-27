// Pure calendar math for rotations. All dates are local calendar days encoded as
// YYYY-MM-DD; arithmetic goes through UTC day numbers so DST never shifts a day.
import type { Cadence, Chore, Override } from './types';

const DAY_MS = 86_400_000;
const pad = (n: number) => String(n).padStart(2, '0');

export const CADENCES: { value: Cadence; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every two weeks' },
  { value: 'monthly', label: 'Monthly' },
];

export function todayIso(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const isValidIso = (iso: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(iso) && !Number.isNaN(toDayNum(iso));

function parts(iso: string): [number, number, number] {
  const [y, m, d] = iso.split('-').map(Number);
  return [y, m, d];
}

export function toDayNum(iso: string): number {
  const [y, m, d] = parts(iso);
  return Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
}

export function fromDayNum(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export const addDays = (iso: string, days: number): string => fromDayNum(toDayNum(iso) + days);

/** Add whole months, clamping the day-of-month (Jan 31 + 1 → Feb 28/29). */
export function addMonths(iso: string, months: number): string {
  const [y, m, d] = parts(iso);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(d, last))}`;
}

const spanDays = (c: Cadence): number => (c === 'daily' ? 1 : c === 'weekly' ? 7 : 14);

/** Index of the period containing `dateIso` (negative before the start date). */
export function periodIndex(chore: Pick<Chore, 'cadence' | 'start'>, dateIso: string): number {
  if (chore.cadence === 'monthly') {
    const [sy, sm, sd] = parts(chore.start);
    const [y, m, d] = parts(dateIso);
    // The boundary day in a short month is clamped (31st → Feb 28), matching periodStart.
    const boundary = Math.min(sd, new Date(Date.UTC(y, m, 0)).getUTCDate());
    return (y - sy) * 12 + (m - sm) - (d < boundary ? 1 : 0);
  }
  return Math.floor((toDayNum(dateIso) - toDayNum(chore.start)) / spanDays(chore.cadence));
}

/** First day of period `index`, YYYY-MM-DD. Doubles as the period's file key. */
export function periodStart(chore: Pick<Chore, 'cadence' | 'start'>, index: number): string {
  return chore.cadence === 'monthly'
    ? addMonths(chore.start, index)
    : addDays(chore.start, index * spanDays(chore.cadence));
}

/** Last day of period `index` (inclusive). */
export function periodEnd(chore: Pick<Chore, 'cadence' | 'start'>, index: number): string {
  return addDays(periodStart(chore, index + 1), -1);
}

export const periodKey = periodStart;

export interface Duty {
  index: number;
  key: string;
  start: string;
  end: string;
  /** Who is on duty after overrides. */
  person: string;
  /** Who the roster would have picked. */
  base: string;
  swapped: boolean;
}

export function duty(chore: Chore, index: number, overrides: Record<string, Override> = {}): Duty {
  const n = chore.roster.length;
  const base = n ? chore.roster[((index % n) + n) % n] : '';
  const key = periodKey(chore, index);
  const ov = overrides[key];
  const person = ov && ov.from === base ? ov.to : base;
  return {
    index,
    key,
    start: key,
    end: periodEnd(chore, index),
    person,
    base,
    swapped: person !== base,
  };
}

/** The current period plus the next `count - 1` ones, starting from `fromIso`. */
export function upcoming(
  chore: Chore,
  overrides: Record<string, Override> | undefined,
  fromIso: string,
  count = 4,
): Duty[] {
  const first = Math.max(0, periodIndex(chore, fromIso));
  return Array.from({ length: count }, (_, i) => duty(chore, first + i, overrides));
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function shortDate(iso: string, withWeekday = false): string {
  const [, m, d] = parts(iso);
  const wd = withWeekday ? `${WEEKDAYS[new Date(toDayNum(iso) * DAY_MS).getUTCDay()]} ` : '';
  return `${wd}${d} ${MONTHS[m - 1]}`;
}

/** Human label for a period relative to `todayIso` ("Today", "This week", "1–7 Sep", "October"). */
export function periodLabel(chore: Pick<Chore, 'cadence' | 'start'>, d: Duty, today: string): string {
  const current = d.start <= today && today <= d.end;
  if (chore.cadence === 'daily') {
    if (current) return 'Today';
    if (d.start === addDays(today, 1)) return 'Tomorrow';
    return shortDate(d.start, true);
  }
  if (chore.cadence === 'monthly') {
    const [y, m] = parts(d.start);
    const [ty] = parts(today);
    const name = `${MONTHS[m - 1]}${y !== ty ? ` ${y}` : ''}`;
    return current ? `This month (${name})` : name;
  }
  const range = `${shortDate(d.start)} – ${shortDate(d.end)}`;
  if (current) return chore.cadence === 'weekly' ? `This week (${range})` : `Now (${range})`;
  return range;
}

export const cadenceLabel = (c: Cadence): string => CADENCES.find((x) => x.value === c)?.label ?? c;

export function formatStamp(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return '';
  return `${shortDate(todayIso(t))} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}
