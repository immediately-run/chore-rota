import { useState } from 'react';
import type { SheetInput } from '../hooks/useRota';
import { newId } from '../lib/store';
import type { Sheet, Slot } from '../lib/types';
import Modal from './Modal';

interface Props {
  initial?: Sheet;
  onSubmit: (input: SheetInput) => void;
  onClose: () => void;
}

interface Row {
  /** Existing slot id (keeps its claim) — new rows have none. */
  id?: string;
  label: string;
  qty: number;
}

const fresh = (label = ''): Row => ({ label, qty: 1 });

function SheetForm({ initial, onSubmit, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [when, setWhen] = useState(initial?.when ?? '');
  const [rows, setRows] = useState<Row[]>(
    initial ? initial.slots.map((s) => ({ id: s.id, label: s.label, qty: 1 })) : [fresh('Cookies'), fresh('Drinks')],
  );

  const setRow = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const slots: Slot[] = rows.flatMap((r) => {
    const label = r.label.trim();
    if (!label) return [];
    if (r.id) return [{ id: r.id, label }];
    if (r.qty <= 1) return [{ id: newId(), label }];
    return Array.from({ length: r.qty }, (_, k) => ({ id: newId(), label: `${label} (${k + 1} of ${r.qty})` }));
  });
  const valid = title.trim().length > 0 && slots.length > 0;

  return (
    <Modal title={initial ? 'Edit sign-up sheet' : 'New sign-up sheet'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          onSubmit({ title: title.trim(), when: when.trim(), slots });
          onClose();
        }}
      >
        <label className="field">
          <span>Event</span>
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bake sale" maxLength={80} />
        </label>
        <label className="field">
          <span>When (free text)</span>
          <input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="Sat 12 Sep, 10:00" maxLength={80} />
        </label>
        <div className="field">
          <span>Slots</span>
          <div className="rows">
            {rows.map((r, i) => (
              <div className="row" key={r.id ?? i}>
                <input
                  value={r.label}
                  onChange={(e) => setRow(i, { label: e.target.value })}
                  placeholder="What is needed"
                  maxLength={60}
                  aria-label={`Slot ${i + 1}`}
                />
                {!r.id && (
                  <input
                    type="number"
                    className="qty"
                    min={1}
                    max={20}
                    value={r.qty}
                    onChange={(e) => setRow(i, { qty: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                    aria-label="How many"
                    title="How many of these"
                  />
                )}
                <button
                  type="button"
                  className="iconbtn"
                  aria-label="Remove slot"
                  onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setRows((rs) => [...rs, fresh()])}>
            + Add slot
          </button>
        </div>
        {initial && <p className="muted small">Removing a slot also drops whoever claimed it.</p>}
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            {initial ? 'Save' : 'Create sheet'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default SheetForm;
