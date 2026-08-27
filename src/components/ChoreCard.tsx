import { cadenceLabel, formatStamp, periodLabel, upcoming } from '../lib/rota';
import type { Duty } from '../lib/rota';
import type { Chore, DoneMark, Override } from '../lib/types';

interface Props {
  chore: Chore;
  overrides: Record<string, Override> | undefined;
  done: Record<string, DoneMark> | undefined;
  today: string;
  me: string;
  writable: boolean;
  onToggleDone: (d: Duty) => void;
  onSwap: (d: Duty) => void;
  onUndoSwap: (d: Duty) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ChoreCard({ chore, overrides, done, today, me, writable, onToggleDone, onSwap, onUndoSwap, onEdit, onDelete }: Props) {
  const periods = upcoming(chore, overrides, today, 4);
  return (
    <article className="card">
      <header className="card-head">
        <div>
          <h3>{chore.name}</h3>
          <div className="muted small">
            {cadenceLabel(chore.cadence)} · from {chore.start}
          </div>
        </div>
        {writable && (
          <div className="card-tools">
            <button type="button" className="iconbtn" onClick={onEdit} aria-label="Edit rotation" title="Edit">
              ✎
            </button>
            <button type="button" className="iconbtn danger" onClick={onDelete} aria-label="Delete rotation" title="Delete">
              ✕
            </button>
          </div>
        )}
      </header>
      <div className="chips" aria-label="Roster">
        {chore.roster.map((n, i) => (
          <span className={`chip${me && n.toLowerCase() === me.toLowerCase() ? ' chip-me' : ''}`} key={`${n}-${i}`}>
            {n}
          </span>
        ))}
      </div>
      <ul className="periods">
        {periods.map((d) => {
          const mark = done?.[d.key];
          const label = periodLabel(chore, d, today);
          return (
            <li className={`period${mark ? ' done' : ''}`} key={d.key}>
              <div className="period-main">
                <div className="period-when">{label}</div>
                <div className="period-who">
                  {d.person || '—'}
                  {d.swapped && (
                    <span className="swap-note">
                      {' '}
                      ↔ for {d.base}
                      {writable && (
                        <button type="button" className="linkbtn" onClick={() => onUndoSwap(d)}>
                          undo
                        </button>
                      )}
                    </span>
                  )}
                </div>
                {mark && (
                  <div className="muted small">
                    ✓ {mark.by} · {formatStamp(mark.at)}
                  </div>
                )}
              </div>
              {writable && (
                <div className="period-actions">
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => onSwap(d)} disabled={chore.roster.length < 2}>
                    Swap
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${mark ? 'btn-ghost' : 'btn-primary'}`}
                    onClick={() => onToggleDone(d)}
                    aria-pressed={!!mark}
                  >
                    {mark ? 'Undo' : 'Done'}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default ChoreCard;
