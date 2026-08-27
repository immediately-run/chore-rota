// Root component — immediately.run renders the default export of THIS file.
// Global CSS is imported here (not in main.tsx) because immediately.run's
// runtime never loads main.tsx; anything the rendered tree needs must be
// reachable from App.tsx.
import './index.css';
import './App.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import ChoreCard from './components/ChoreCard';
import ChoreForm from './components/ChoreForm';
import DutyBoard from './components/DutyBoard';
import Modal from './components/Modal';
import NameDialog from './components/NameDialog';
import SheetCard from './components/SheetCard';
import SheetForm from './components/SheetForm';
import StoragePanel from './components/StoragePanel';
import SwapDialog from './components/SwapDialog';
import Toast from './components/Toast';
import TopBar from './components/TopBar';
import { useMe } from './hooks/useMe';
import { useRota } from './hooks/useRota';
import { useStorage } from './hooks/useStorage';
import type { Duty } from './lib/rota';
import { todayIso } from './lib/rota';
import { seedSample } from './lib/seed';
import type { Chore, Sheet } from './lib/types';

type Dialog =
  | { kind: 'chore'; chore?: Chore }
  | { kind: 'sheet'; sheet?: Sheet }
  | { kind: 'swap'; chore: Chore; d: Duty }
  | { kind: 'confirm'; title: string; body: string; action: () => void }
  | { kind: 'name'; reason?: string }
  | null;

const NAME_REASON = 'Set your name first so people can see who did what.';

function App() {
  const storage = useStorage();
  const { me, fromHost } = useMe(storage.config);
  const store = storage.phase === 'ready' || storage.store ? storage.store : null;
  const rota = useRota(store, me);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [today, setToday] = useState(todayIso);
  const close = useCallback(() => setDialog(null), []);

  /** Writes that record a person need a name; without one the record could never be undone by its author. */
  const named = useCallback(
    <A extends unknown[]>(fn: (...args: A) => unknown) =>
      (...args: A) => {
        if (!me) setDialog({ kind: 'name', reason: NAME_REASON });
        else fn(...args);
      },
    [me],
  );

  // Keep "today" fresh for tabs left open over midnight.
  useEffect(() => {
    const t = setInterval(() => setToday(todayIso()), 60_000);
    return () => clearInterval(t);
  }, []);

  // Sample data on the first run of a PRIVATE store (never into a shared space).
  const seeding = useRef(false);
  const { snap, loading, writable } = rota;
  const isPrivate = !!store && store === storage.privateStore;
  useEffect(() => {
    if (!store || !isPrivate || !writable || loading || storage.config.seeded || seeding.current) return;
    if (snap.chores.length > 0 || snap.sheets.length > 0) {
      void storage.markSeeded();
      return;
    }
    seeding.current = true;
    (async () => {
      try {
        await seedSample(store.root, me || 'You');
        await storage.markSeeded();
        await rota.reload();
      } finally {
        seeding.current = false;
      }
    })();
  }, [store, isPrivate, writable, loading, snap.chores.length, snap.sheets.length, storage, me, rota]);

  const shared = store?.kind === 'space' || (store?.kind === 'dev' && store.spaceId === 'dev');
  const storeLabel = store
    ? store.kind === 'space'
      ? (store.name ?? store.spaceId ?? 'space')
      : shared
        ? 'dev space'
        : 'only you'
    : '…';

  const choosing = storage.phase === 'choose';
  const firstRun = choosing && !store;

  const storagePanel = (
    <StoragePanel
      firstRun={firstRun}
      store={store}
      busy={storage.busy}
      error={storage.error}
      onPrivate={() => void storage.usePrivate()}
      onOpen={() => void storage.openExisting()}
      onCreate={(name) => void storage.createNew(name)}
      onClose={storage.cancelChoose}
    />
  );

  if (storage.phase === 'booting') {
    return (
      <div className="app">
        <p className="muted center">Opening your rota…</p>
      </div>
    );
  }

  if (firstRun) {
    return (
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="mark" aria-hidden="true" />
            <span>Chore rota</span>
          </div>
        </header>
        <h1 className="hero-title">
          Who takes out the trash, <span className="grad-text">who brings the cookies.</span>
        </h1>
        {storagePanel}
      </div>
    );
  }

  return (
    <div className="app">
      <TopBar
        storeLabel={storeLabel}
        readOnly={!writable}
        shared={shared}
        pulse={rota.pulse}
        me={me}
        fromHost={fromHost}
        onStorage={storage.chooseStorage}
        onName={() => setDialog({ kind: 'name' })}
      />

      <section className="section">
        <div className="sechead">
          <h2>On duty now</h2>
          <span className="slug">{today}</span>
        </div>
        {loading ? (
          <p className="muted">Loading…</p>
        ) : snap.chores.length === 0 ? (
          <p className="empty">No rotations yet. Add one below and the board fills in.</p>
        ) : (
          <DutyBoard snap={snap} today={today} me={me} writable={writable} onToggleDone={named(rota.toggleDone)} />
        )}
      </section>

      <section className="section">
        <div className="sechead">
          <h2>Rotations</h2>
          {writable && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setDialog({ kind: 'chore' })}>
              + New rotation
            </button>
          )}
        </div>
        <div className="stack">
          {snap.chores.map((chore) => (
            <ChoreCard
              key={chore.id}
              chore={chore}
              overrides={snap.overrides[chore.id]}
              done={snap.done[chore.id]}
              today={today}
              me={me}
              writable={writable}
              onToggleDone={named((d) => void rota.toggleDone(chore, d))}
              onSwap={named((d) => setDialog({ kind: 'swap', chore, d }))}
              onUndoSwap={named((d) => void rota.undoSwap(chore, d))}
              onEdit={() => setDialog({ kind: 'chore', chore })}
              onDelete={() =>
                setDialog({
                  kind: 'confirm',
                  title: 'Delete rotation?',
                  body: `“${chore.name}” and its swaps and done-marks will be removed for everyone.`,
                  action: () => void rota.removeChore(chore.id),
                })
              }
            />
          ))}
        </div>
      </section>

      <section className="section">
        <div className="sechead">
          <h2>Sign-up sheets</h2>
          {writable && (
            <button type="button" className="btn btn-sm btn-primary" onClick={() => setDialog({ kind: 'sheet' })}>
              + New sheet
            </button>
          )}
        </div>
        {!loading && snap.sheets.length === 0 && (
          <p className="empty">No sheets yet. Make one for the next bake sale, potluck, or clean-up day.</p>
        )}
        <div className="stack">
          {snap.sheets.map((sheet) => (
            <SheetCard
              key={sheet.id}
              sheet={sheet}
              claims={snap.claims[sheet.id]}
              me={me}
              writable={writable}
              onClaim={named((slot) => void rota.claim(sheet, slot))}
              onRelease={named((slot) => void rota.release(sheet, slot))}
              onEdit={() => setDialog({ kind: 'sheet', sheet })}
              onDelete={() =>
                setDialog({
                  kind: 'confirm',
                  title: 'Delete sheet?',
                  body: `“${sheet.title}” and all its claims will be removed for everyone.`,
                  action: () => void rota.removeSheet(sheet.id),
                })
              }
            />
          ))}
        </div>
      </section>

      <footer className="foot">
        {shared
          ? 'Everyone with access to this space sees the same rota; changes show up within a few seconds.'
          : 'This rota is private. Switch to a shared space from the top bar to run it with others.'}
      </footer>

      {choosing && (
        <Modal title="Where to keep the rota" onClose={storage.cancelChoose}>
          {storagePanel}
        </Modal>
      )}
      {dialog?.kind === 'chore' && (
        <ChoreForm
          initial={dialog.chore}
          me={me}
          onClose={close}
          onSubmit={(input) => void (dialog.chore ? rota.updateChore(dialog.chore, input) : rota.addChore(input))}
        />
      )}
      {dialog?.kind === 'sheet' && (
        <SheetForm
          initial={dialog.sheet}
          onClose={close}
          onSubmit={(input) => void (dialog.sheet ? rota.updateSheet(dialog.sheet, input) : rota.addSheet(input))}
        />
      )}
      {dialog?.kind === 'swap' && (
        <SwapDialog
          chore={dialog.chore}
          d={dialog.d}
          overrides={snap.overrides[dialog.chore.id]}
          today={today}
          onClose={close}
          onConfirm={(to, reciprocal) => {
            void rota.swap(dialog.chore, dialog.d, to, reciprocal);
            close();
          }}
        />
      )}
      {dialog?.kind === 'confirm' && (
        <Modal title={dialog.title} onClose={close}>
          <p className="muted">{dialog.body}</p>
          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={close}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                dialog.action();
                close();
              }}
            >
              Delete
            </button>
          </div>
        </Modal>
      )}
      {dialog?.kind === 'name' && (
        <NameDialog
          initial={storage.config.name ?? ''}
          reason={dialog.reason}
          onSave={(n) => void storage.setName(n)}
          onClose={close}
        />
      )}
      {rota.error && <Toast message={rota.error} onClose={rota.clearError} />}
    </div>
  );
}

export default App;
