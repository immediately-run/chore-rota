// Data model. One record = one file under the active store (see repo.ts for the
// exact layout). Everything is plain JSON so other tools / people can read it.

export type Cadence = 'daily' | 'weekly' | 'biweekly' | 'monthly';

export interface Chore {
  id: string;
  name: string;
  cadence: Cadence;
  /** First day of period 0, as YYYY-MM-DD (local calendar date). */
  start: string;
  /** Ordered roster; period i is covered by roster[i mod length]. */
  roster: string[];
  createdBy: string;
  createdAt: string;
}

/** One period's duty handed from `from` to `to` (a swap writes two of these). */
export interface Override {
  period: string;
  from: string;
  to: string;
  by: string;
  at: string;
}

export interface DoneMark {
  by: string;
  at: string;
}

export interface Slot {
  id: string;
  label: string;
}

export interface Sheet {
  id: string;
  title: string;
  /** Free-text date / time ("Sat 12 Sep, 10:00"). */
  when: string;
  slots: Slot[];
  createdBy: string;
  createdAt: string;
}

export interface Claim {
  by: string;
  at: string;
}

/** Everything the UI needs, loaded from one store root. */
export interface Snapshot {
  chores: Chore[];
  /** choreId → periodKey → override */
  overrides: Record<string, Record<string, Override>>;
  /** choreId → periodKey → done mark */
  done: Record<string, Record<string, DoneMark>>;
  sheets: Sheet[];
  /** sheetId → slotId → claim */
  claims: Record<string, Record<string, Claim>>;
}

export const emptySnapshot = (): Snapshot => ({
  chores: [],
  overrides: {},
  done: {},
  sheets: [],
  claims: {},
});

/** Per-user private config (`<private>/config.json`). */
export interface Config {
  /** Which store the user chose last time. Absent = first run. */
  storage?: 'private' | 'space';
  spaceId?: string;
  /** Display name when the host reports no login. */
  name?: string;
  /** Private store already got the sample data. */
  seeded?: boolean;
}
