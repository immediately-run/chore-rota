// Loads a Snapshot from the active store, polls the record directories so other
// members' writes show up (no remote watch events on shared spaces), and exposes
// the write actions. Every action re-reads after writing; a poll-triggered reload
// that was NOT caused by this tab bumps `pulse` so the UI can flash "updated".
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  claimSlot,
  clearDone,
  clearOverride,
  deleteChore,
  deleteSheet,
  initStore,
  loadSnapshot,
  markDone,
  releaseSlot,
  saveChore,
  saveSheet,
  setOverride,
  watchedDirs,
} from '../lib/repo';
import { duty } from '../lib/rota';
import type { Duty } from '../lib/rota';
import { newId, pollDir } from '../lib/store';
import type { Store } from '../lib/store';
import type { Chore, Sheet, Slot, Snapshot } from '../lib/types';
import { emptySnapshot } from '../lib/types';

const POLL_MS = 3000;
const EMPTY: Snapshot = emptySnapshot();
/** A poll firing within this window of our own write is our write echoing back. */
const OWN_WRITE_WINDOW_MS = 2 * POLL_MS;

export interface ChoreInput {
  name: string;
  cadence: Chore['cadence'];
  start: string;
  roster: string[];
}

export interface SheetInput {
  title: string;
  when: string;
  slots: Slot[];
}

export function useRota(store: Store | null, me: string) {
  const root = store?.root ?? null;
  const writable = store?.mode === 'rw';
  // The snapshot remembers which root it came from, so "loading" is derived
  // (no state juggling when the store changes).
  const [loaded, setLoaded] = useState<{ root: string | null; snap: Snapshot }>({ root: null, snap: EMPTY });
  const snap = loaded.root === root ? loaded.snap : EMPTY;
  const loading = root !== null && loaded.root !== root;
  /** Timestamp of the last reload caused by someone else's write (0 = never). */
  const [pulse, setPulse] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const gen = useRef(0);
  const lastLocalWrite = useRef(0);

  const reload = useCallback(
    async (external = false) => {
      if (!root) return;
      const g = ++gen.current;
      const next = await loadSnapshot(root);
      if (g !== gen.current) return;
      setLoaded({ root, snap: next });
      if (external) setPulse(Date.now());
    },
    [root],
  );

  // (Re)load whenever the store changes.
  useEffect(() => {
    if (!root) return;
    (async () => {
      if (writable) await initStore(root).catch(() => undefined);
      await reload();
    })();
  }, [root, writable, reload]);

  // Poll every directory that holds records for the current snapshot.
  const dirKey = useMemo(() => (root ? watchedDirs(root, snap).join('\n') : ''), [root, snap]);
  useEffect(() => {
    if (!dirKey) return;
    const onChange = () => void reload(Date.now() - lastLocalWrite.current > OWN_WRITE_WINDOW_MS);
    const stops = dirKey.split('\n').map((d) => pollDir(d, onChange, POLL_MS));
    return () => stops.forEach((stop) => stop());
  }, [dirKey, reload]);

  const mutate = useCallback(
    async (job: (root: string) => Promise<void>) => {
      if (!root) return;
      if (!writable) {
        setError('This space is read-only for you.');
        return;
      }
      setBusy(true);
      setError(null);
      lastLocalWrite.current = Date.now();
      try {
        await job(root);
        lastLocalWrite.current = Date.now();
        await reload();
      } catch (e) {
        const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
        setError(
          code === 'EROFS' ? 'This space is read-only for you.' : e instanceof Error ? e.message : 'Could not save.',
        );
      } finally {
        setBusy(false);
      }
    },
    [root, writable, reload],
  );

  const who = me || 'someone';
  const stamp = () => new Date().toISOString();

  const actions = useMemo(
    () => ({
      addChore: (input: ChoreInput) =>
        mutate((r) =>
          saveChore(r, { id: newId(), ...input, createdBy: who, createdAt: stamp() }),
        ),
      updateChore: (chore: Chore, input: ChoreInput) => mutate((r) => saveChore(r, { ...chore, ...input })),
      removeChore: (choreId: string) => mutate((r) => deleteChore(r, choreId)),
      toggleDone: (chore: Chore, d: Duty) =>
        mutate((r) =>
          snap.done[chore.id]?.[d.key]
            ? clearDone(r, chore.id, d.key)
            : markDone(r, chore.id, d.key, { by: who, at: stamp() }),
        ),
      /** Hand `d` to `to`; when `reciprocalIndex` is given, that period goes to `d.person`. */
      swap: (chore: Chore, d: Duty, to: string, reciprocalIndex: number | null) =>
        mutate(async (r) => {
          const at = stamp();
          if (to === d.base) await clearOverride(r, chore.id, d.key);
          else await setOverride(r, chore.id, { period: d.key, from: d.base, to, by: who, at });
          if (reciprocalIndex !== null) {
            const other = duty(chore, reciprocalIndex, snap.overrides[chore.id]);
            if (d.person === other.base) await clearOverride(r, chore.id, other.key);
            else await setOverride(r, chore.id, { period: other.key, from: other.base, to: d.person, by: who, at });
          }
        }),
      undoSwap: (chore: Chore, d: Duty) => mutate((r) => clearOverride(r, chore.id, d.key)),
      addSheet: (input: SheetInput) =>
        mutate((r) => saveSheet(r, { id: newId(), ...input, createdBy: who, createdAt: stamp() })),
      updateSheet: (sheet: Sheet, input: SheetInput) => mutate((r) => saveSheet(r, { ...sheet, ...input })),
      removeSheet: (sheetId: string) => mutate((r) => deleteSheet(r, sheetId)),
      claim: (sheet: Sheet, slot: Slot) =>
        mutate((r) => claimSlot(r, sheet.id, slot.id, { by: who, at: stamp() })),
      release: (sheet: Sheet, slot: Slot) => mutate((r) => releaseSlot(r, sheet.id, slot.id)),
    }),
    [mutate, who, snap],
  );

  const clearError = useCallback(() => setError(null), []);

  return { snap, loading, pulse, error, busy, writable, reload, clearError, ...actions };
}
