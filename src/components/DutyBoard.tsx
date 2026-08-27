import { cadenceLabel, duty, periodIndex, periodLabel, shortDate } from '../lib/rota';
import type { Duty } from '../lib/rota';
import type { Chore, Snapshot } from '../lib/types';

interface Props {
  snap: Snapshot;
  today: string;
  me: string;
  writable: boolean;
  onToggleDone: (chore: Chore, d: Duty) => void;
}

/** The "this week" board: one tile per chore with whoever is on duty now. */
function DutyBoard({ snap, today, me, writable, onToggleDone }: Props) {
  if (snap.chores.length === 0) return null;
  return (
    <div className="board" role="list">
      {snap.chores.map((chore) => {
        const idx = periodIndex(chore, today);
        if (idx < 0) {
          return (
            <div className="tile tile-soon" role="listitem" key={chore.id}>
              <div className="tile-chore">{chore.name}</div>
              <div className="tile-person muted">Starts {shortDate(chore.start, true)}</div>
              <div className="tile-meta">{cadenceLabel(chore.cadence)}</div>
            </div>
          );
        }
        const d = duty(chore, idx, snap.overrides[chore.id]);
        const mark = snap.done[chore.id]?.[d.key];
        const mine = !!me && d.person.toLowerCase() === me.toLowerCase();
        return (
          <div className={`tile${mark ? ' done' : ''}${mine ? ' mine' : ''}`} role="listitem" key={chore.id}>
            <div className="tile-chore">{chore.name}</div>
            <div className="tile-person">
              {d.person || '—'}
              {mine && <span className="you-tag">you</span>}
              {d.swapped && <span className="swap-tag" title={`Roster: ${d.base}`}>↔</span>}
            </div>
            <div className="tile-meta">{periodLabel(chore, d, today)}</div>
            <button
              type="button"
              className={`check${mark ? ' on' : ''}`}
              disabled={!writable}
              onClick={() => onToggleDone(chore, d)}
              aria-pressed={!!mark}
              aria-label={mark ? `Done by ${mark.by}, tap to undo` : 'Mark done'}
            >
              <span aria-hidden="true">✓</span> {mark ? `Done · ${mark.by}` : 'Mark done'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default DutyBoard;
