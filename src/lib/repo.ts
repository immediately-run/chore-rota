// File layout + read/write for one store root. One record per file so several
// members writing at once never clobber each other (last-write-wins per file):
//
//   <root>/chores/<choreId>.json
//   <root>/overrides/<choreId>/<periodKey>.json
//   <root>/done/<choreId>/<periodKey>.json
//   <root>/sheets/<sheetId>.json
//   <root>/claims/<sheetId>/<slotId>.json
import fs from 'fs';
import { ensureDir, listFiles, readJson, readText, removeFile, writeJson, writeText } from './store';
import type { Chore, Claim, DoneMark, Override, Sheet, Snapshot } from './types';
import { emptySnapshot } from './types';

export const dirs = {
  chores: (root: string) => `${root}/chores`,
  sheets: (root: string) => `${root}/sheets`,
  overrides: (root: string, choreId: string) => `${root}/overrides/${choreId}`,
  done: (root: string, choreId: string) => `${root}/done/${choreId}`,
  claims: (root: string, sheetId: string) => `${root}/claims/${sheetId}`,
};

/** Every directory a live view needs to poll for this snapshot. */
export function watchedDirs(root: string, snap: Snapshot): string[] {
  return [
    dirs.chores(root),
    dirs.sheets(root),
    ...snap.chores.flatMap((c) => [dirs.overrides(root, c.id), dirs.done(root, c.id)]),
    ...snap.sheets.map((s) => dirs.claims(root, s.id)),
  ];
}

const stripExt = (name: string) => name.replace(/\.json$/, '');

/** Create a record directory with a `.keep` marker. `pollDir` only reports a
 *  change once it has a non-empty baseline, so an empty directory would hide its
 *  FIRST record from other members; the marker gives every directory a baseline. */
export async function prepDir(dir: string): Promise<void> {
  await ensureDir(dir);
  if ((await readText(`${dir}/.keep`)) === null) await writeText(`${dir}/.keep`, '');
}

/** Make the top-level record directories exist (call once per rw store). */
export const initStore = (root: string) => Promise.all([prepDir(dirs.chores(root)), prepDir(dirs.sheets(root))]);

async function readDirOfJson<T>(dir: string): Promise<Record<string, T>> {
  const out: Record<string, T> = {};
  const names = await listFiles(dir, '.json');
  await Promise.all(
    names.map(async (n) => {
      const v = await readJson<T | null>(`${dir}/${n}`, null);
      if (v) out[stripExt(n)] = v;
    }),
  );
  return out;
}

export async function loadSnapshot(root: string): Promise<Snapshot> {
  const snap = emptySnapshot();
  const [chores, sheets] = await Promise.all([
    readDirOfJson<Chore>(dirs.chores(root)),
    readDirOfJson<Sheet>(dirs.sheets(root)),
  ]);
  snap.chores = Object.values(chores)
    .filter((c) => Array.isArray(c.roster))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  snap.sheets = Object.values(sheets)
    .filter((s) => Array.isArray(s.slots))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  await Promise.all([
    ...snap.chores.map(async (c) => {
      const [ov, dn] = await Promise.all([
        readDirOfJson<Override>(dirs.overrides(root, c.id)),
        readDirOfJson<DoneMark>(dirs.done(root, c.id)),
      ]);
      snap.overrides[c.id] = ov;
      snap.done[c.id] = dn;
    }),
    ...snap.sheets.map(async (s) => {
      snap.claims[s.id] = await readDirOfJson<Claim>(dirs.claims(root, s.id));
    }),
  ]);
  return snap;
}

async function removeDir(dir: string): Promise<void> {
  for (const n of await listFiles(dir)) await removeFile(`${dir}/${n}`);
  try {
    await fs.promises.rmdir(dir);
  } catch {
    /* missing or not empty — fine */
  }
}

// ── chores ─────────────────────────────────────────────────────────────────────

export async function saveChore(root: string, chore: Chore): Promise<void> {
  await Promise.all([prepDir(dirs.overrides(root, chore.id)), prepDir(dirs.done(root, chore.id))]);
  await writeJson(`${dirs.chores(root)}/${chore.id}.json`, chore);
}

export async function deleteChore(root: string, choreId: string): Promise<void> {
  await removeFile(`${dirs.chores(root)}/${choreId}.json`);
  await Promise.all([removeDir(dirs.overrides(root, choreId)), removeDir(dirs.done(root, choreId))]);
}

export const setOverride = (root: string, choreId: string, ov: Override) =>
  writeJson(`${dirs.overrides(root, choreId)}/${ov.period}.json`, ov);

export const clearOverride = (root: string, choreId: string, period: string) =>
  removeFile(`${dirs.overrides(root, choreId)}/${period}.json`);

export const markDone = (root: string, choreId: string, period: string, mark: DoneMark) =>
  writeJson(`${dirs.done(root, choreId)}/${period}.json`, mark);

export const clearDone = (root: string, choreId: string, period: string) =>
  removeFile(`${dirs.done(root, choreId)}/${period}.json`);

// ── sheets ─────────────────────────────────────────────────────────────────────

export async function saveSheet(root: string, sheet: Sheet): Promise<void> {
  await prepDir(dirs.claims(root, sheet.id));
  await writeJson(`${dirs.sheets(root)}/${sheet.id}.json`, sheet);
}

export async function deleteSheet(root: string, sheetId: string): Promise<void> {
  await removeFile(`${dirs.sheets(root)}/${sheetId}.json`);
  await removeDir(dirs.claims(root, sheetId));
}

export const claimSlot = (root: string, sheetId: string, slotId: string, claim: Claim) =>
  writeJson(`${dirs.claims(root, sheetId)}/${slotId}.json`, claim);

export const releaseSlot = (root: string, sheetId: string, slotId: string) =>
  removeFile(`${dirs.claims(root, sheetId)}/${slotId}.json`);
