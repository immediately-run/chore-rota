import { formatStamp } from '../lib/rota';
import type { Claim, Sheet, Slot } from '../lib/types';

interface Props {
  sheet: Sheet;
  claims: Record<string, Claim> | undefined;
  me: string;
  writable: boolean;
  onClaim: (slot: Slot) => void;
  onRelease: (slot: Slot) => void;
  onEdit: () => void;
  onDelete: () => void;
}

function SheetCard({ sheet, claims, me, writable, onClaim, onRelease, onEdit, onDelete }: Props) {
  const taken = sheet.slots.filter((s) => claims?.[s.id]).length;
  return (
    <article className="card">
      <header className="card-head">
        <div>
          <h3>{sheet.title}</h3>
          <div className="muted small">
            {sheet.when && <>{sheet.when} · </>}
            {taken}/{sheet.slots.length} filled
          </div>
        </div>
        {writable && (
          <div className="card-tools">
            <button type="button" className="iconbtn" onClick={onEdit} aria-label="Edit sheet" title="Edit">
              ✎
            </button>
            <button type="button" className="iconbtn danger" onClick={onDelete} aria-label="Delete sheet" title="Delete">
              ✕
            </button>
          </div>
        )}
      </header>
      <ul className="slots">
        {sheet.slots.map((slot) => {
          const c = claims?.[slot.id];
          const mine = !!c && !!me && c.by.toLowerCase() === me.toLowerCase();
          return (
            <li className={`slot${c ? ' taken' : ''}${mine ? ' mine' : ''}`} key={slot.id}>
              <div className="slot-main">
                <div className="slot-label">{slot.label}</div>
                <div className="muted small">
                  {c ? (
                    <>
                      {mine ? 'You' : c.by} · {formatStamp(c.at)}
                    </>
                  ) : (
                    'Open'
                  )}
                </div>
              </div>
              {writable &&
                (c ? (
                  mine ? (
                    <button type="button" className="btn btn-sm btn-ghost" onClick={() => onRelease(slot)}>
                      Release
                    </button>
                  ) : (
                    <span className="taken-tag">taken</span>
                  )
                ) : (
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => onClaim(slot)}>
                    I'll bring it
                  </button>
                ))}
            </li>
          );
        })}
      </ul>
    </article>
  );
}

export default SheetCard;
