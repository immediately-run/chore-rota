import { useEffect, useState } from 'react';

interface Props {
  /** Timestamp of the last externally-caused reload; 0 = none yet. */
  pulse: number;
  shared: boolean;
}

/** "Live" indicator for shared spaces; flashes "Updated" for a moment after a
 *  poll picked up someone else's write. */
function LivePill({ pulse, shared }: Props) {
  const [seen, setSeen] = useState(0);
  const flash = pulse !== 0 && pulse !== seen;

  useEffect(() => {
    if (pulse === seen) return;
    const t = setTimeout(() => setSeen(pulse), 1800);
    return () => clearTimeout(t);
  }, [pulse, seen]);

  if (!shared) return null;
  return (
    <span className={`live${flash ? ' flash' : ''}`} aria-live="polite">
      <span className="dot" aria-hidden="true">
        ●
      </span>
      {flash ? 'Updated' : 'Live'}
    </span>
  );
}

export default LivePill;
