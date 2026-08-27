import { useState } from 'react';
import type { Store } from '../lib/store';

interface Props {
  firstRun: boolean;
  store: Store | null;
  busy: boolean;
  error: string | null;
  onPrivate: () => void;
  onOpen: () => void;
  onCreate: (name: string) => void;
  onClose: () => void;
}

/** Where should the rota live: a shared space (the normal mode) or private? */
function StoragePanel({ firstRun, store, busy, error, onPrivate, onOpen, onCreate, onClose }: Props) {
  const [name, setName] = useState('Chore rota');

  return (
    <section className="storage">
      {firstRun && (
        <p className="deck">
          Rotations and sign-up sheets for a shared space. Pick where to keep them — you can change this later.
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="choice-grid">
        <div className="choice">
          <h3>Create a shared space</h3>
          <p>Start a new space for your flat, office, or club. You then share it with people from the Spaces page on immediately.run — the app cannot invite anyone itself.</p>
          <label className="field">
            <span>Space name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </label>
          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onCreate(name)}>
            Create and use it →
          </button>
        </div>
        <div className="choice">
          <h3>Open an existing space</h3>
          <p>Someone already shared a space with you? Pick it (read-only or read-write, as granted).</p>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onOpen}>
            Choose a space →
          </button>
        </div>
        <div className="choice">
          <h3>Keep it private</h3>
          <p>Only you see it. Good for a personal routine or to try the app; no prompts, ever.</p>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={onPrivate}>
            Use private storage →
          </button>
        </div>
      </div>
      {!firstRun && store && (
        <p className="muted small">
          Currently: {store.kind === 'space' ? `shared space “${store.name ?? store.spaceId}”` : 'private storage'}
          {store.mode === 'ro' ? ' (read-only)' : ''}.{' '}
          <button type="button" className="linkbtn" onClick={onClose}>
            Keep it
          </button>
        </p>
      )}
    </section>
  );
}

export default StoragePanel;
