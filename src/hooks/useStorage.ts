// Boot sequence + store selection. The private (per-user) store is opened first
// and always kept: it holds `config.json`, which remembers whether the user chose
// private mode or a shared space (by id) so the next boot needs no prompt.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSharedStore,
  openPrivateStore,
  openRememberedSpace,
  pickSharedStore,
  readJson,
  writeJson,
} from '../lib/store';
import type { Store } from '../lib/store';
import type { Config } from '../lib/types';

/** Sub-folder inside a space so the app's files sit next to other apps' data. */
const SPACE_SUB = 'chore-rota';

export type StoragePhase = 'booting' | 'choose' | 'ready';

export interface StorageState {
  phase: StoragePhase;
  privateStore: Store | null;
  store: Store | null;
  config: Config;
  busy: boolean;
  error: string | null;
}

const errorCode = (e: unknown): string | undefined =>
  typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : undefined;

const describe = (e: unknown, fallback: string): string => {
  const code = errorCode(e);
  if (code === 'forbidden') return 'This app is not allowed to open spaces here.';
  if (code === 'auth-required') return 'Sign in to use a shared space.';
  return e instanceof Error && e.message ? e.message : fallback;
};

export function useStorage() {
  const [state, setState] = useState<StorageState>({
    phase: 'booting',
    privateStore: null,
    store: null,
    config: {},
    busy: false,
    error: null,
  });
  const configRef = useRef<Config>({});
  const privateRef = useRef<Store | null>(null);

  const saveConfig = useCallback(async (patch: Partial<Config>) => {
    const next = { ...configRef.current, ...patch };
    configRef.current = next;
    setState((s) => ({ ...s, config: next }));
    const priv = privateRef.current;
    if (priv && priv.mode === 'rw') {
      try {
        await writeJson(`${priv.root}/config.json`, next);
      } catch {
        /* config is a convenience; the session still works */
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let priv: Store;
      try {
        priv = await openPrivateStore('data');
      } catch (e) {
        if (!cancelled)
          setState((s) => ({ ...s, phase: 'choose', error: describe(e, 'Could not open private storage.') }));
        return;
      }
      privateRef.current = priv;
      const cfg = await readJson<Config>(`${priv.root}/config.json`, {});
      configRef.current = cfg;
      if (cancelled) return;
      if (cfg.storage === 'private') {
        setState({ phase: 'ready', privateStore: priv, store: priv, config: cfg, busy: false, error: null });
        return;
      }
      if (cfg.storage === 'space' && cfg.spaceId) {
        const shared = await openRememberedSpace(cfg.spaceId, SPACE_SUB);
        if (cancelled) return;
        if (shared) {
          setState({ phase: 'ready', privateStore: priv, store: shared, config: cfg, busy: false, error: null });
          return;
        }
        setState({
          phase: 'choose',
          privateStore: priv,
          store: null,
          config: cfg,
          busy: false,
          error: 'The shared space you used last time is no longer available. Pick where to keep your rota.',
        });
        return;
      }
      setState({ phase: 'choose', privateStore: priv, store: null, config: cfg, busy: false, error: null });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const usePrivate = useCallback(async () => {
    const priv = privateRef.current;
    if (!priv) return;
    setState((s) => ({ ...s, phase: 'ready', store: priv, error: null }));
    await saveConfig({ storage: 'private' });
  }, [saveConfig]);

  const adopt = useCallback(
    async (store: Store) => {
      setState((s) => ({ ...s, phase: 'ready', store, busy: false, error: null }));
      await saveConfig({ storage: 'space', spaceId: store.spaceId });
    },
    [saveConfig],
  );

  const run = useCallback(
    async (job: () => Promise<Store>, fallback: string) => {
      setState((s) => ({ ...s, busy: true, error: null }));
      try {
        await adopt(await job());
      } catch (e) {
        const code = errorCode(e);
        setState((s) => ({ ...s, busy: false, error: code === 'cancelled' ? null : describe(e, fallback) }));
      }
    },
    [adopt],
  );

  const openExisting = useCallback(
    () => run(() => pickSharedStore(SPACE_SUB), 'Could not open that space.'),
    [run],
  );

  const createNew = useCallback(
    (name: string) => run(() => createSharedStore(name.trim() || 'Chore rota', SPACE_SUB), 'Could not create a space.'),
    [run],
  );

  const chooseStorage = useCallback(() => setState((s) => ({ ...s, phase: 'choose', error: null })), []);
  const cancelChoose = useCallback(
    () => setState((s) => (s.store ? { ...s, phase: 'ready', error: null } : s)),
    [],
  );

  const setName = useCallback((name: string) => saveConfig({ name: name.trim() }), [saveConfig]);
  const markSeeded = useCallback(() => saveConfig({ seeded: true }), [saveConfig]);

  return { ...state, usePrivate, openExisting, createNew, chooseStorage, cancelChoose, setName, markSeeded };
}
