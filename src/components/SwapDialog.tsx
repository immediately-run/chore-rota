import { useMemo, useState } from 'react';
import { duty, periodLabel } from '../lib/rota';
import type { Duty } from '../lib/rota';
import type { Chore, Override } from '../lib/types';
import Modal from './Modal';

interface Props {
  chore: Chore;
  d: Duty;
  overrides: Record<string, Override> | undefined;
  today: string;
  onConfirm: (to: string, reciprocalIndex: number | null) => void;
  onClose: () => void;
}

/** Hand one period to someone else, optionally trading it for their next turn. */
function SwapDialog({ chore, d, overrides, today, onConfirm, onClose }: Props) {
  const candidates = useMemo(
    () => Array.from(new Set(chore.roster)).filter((n) => n !== d.person),
    [chore.roster, d.person],
  );
  const [to, setTo] = useState(candidates[0] ?? '');
  const [trade, setTrade] = useState(true);

  // The next period (after this one) where `to` is on duty — that's what comes back.
  const reciprocal = useMemo(() => {
    if (!to) return null;
    const horizon = Math.max(12, chore.roster.length * 2);
    for (let i = d.index + 1; i <= d.index + horizon; i++) {
      const dd = duty(chore, i, overrides);
      if (dd.person === to) return dd;
    }
    return null;
  }, [chore, d.index, overrides, to]);

  return (
    <Modal title="Swap a turn" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (to) onConfirm(to, trade && reciprocal ? reciprocal.index : null);
        }}
      >
        <p className="muted">
          <b>{chore.name}</b>, {periodLabel(chore, d, today)} — currently <b>{d.person}</b>.
        </p>
        <label className="field">
          <span>Who takes it instead</span>
          <select value={to} onChange={(e) => setTo(e.target.value)}>
            {candidates.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        {reciprocal && (
          <label className="checkline">
            <input type="checkbox" checked={trade} onChange={(e) => setTrade(e.target.checked)} />
            <span>
              …and {d.person} takes {to}'s turn: {periodLabel(chore, reciprocal, today)}
            </span>
          </label>
        )}
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!to}>
            Swap
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default SwapDialog;
