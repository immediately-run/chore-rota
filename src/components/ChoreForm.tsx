import { useState } from 'react';
import type { ChoreInput } from '../hooks/useRota';
import { CADENCES, isValidIso, todayIso } from '../lib/rota';
import type { Cadence, Chore } from '../lib/types';
import Modal from './Modal';

interface Props {
  initial?: Chore;
  me: string;
  onSubmit: (input: ChoreInput) => void;
  onClose: () => void;
}

function ChoreForm({ initial, me, onSubmit, onClose }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [cadence, setCadence] = useState<Cadence>(initial?.cadence ?? 'weekly');
  const [start, setStart] = useState(initial?.start ?? todayIso());
  const [rosterText, setRosterText] = useState(initial ? initial.roster.join('\n') : me);

  const roster = rosterText
    .split(/\r?\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
  const valid = name.trim().length > 0 && roster.length > 0 && isValidIso(start);

  return (
    <Modal title={initial ? 'Edit rotation' : 'New rotation'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSubmit({ name: name.trim(), cadence, start, roster });
          onClose();
        }}
      >
        <label className="field">
          <span>Chore</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Take out the trash" maxLength={80} />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Cadence</span>
            <select value={cadence} onChange={(e) => setCadence(e.target.value as Cadence)}>
              {CADENCES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Starts on</span>
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
          </label>
        </div>
        <label className="field">
          <span>Roster, in order (one name per line)</span>
          <textarea rows={4} value={rosterText} onChange={(e) => setRosterText(e.target.value)} placeholder={'You\nSam\nAlex'} />
        </label>
        {initial && (
          <p className="muted small">Changing the roster or start date re-computes who is on duty; existing swaps and done-marks stay attached to their dates.</p>
        )}
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {initial ? 'Save' : 'Add rotation'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default ChoreForm;
