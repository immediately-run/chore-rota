import LivePill from './LivePill';
import ThemeSwitch from './ThemeSwitch';

interface Props {
  storeLabel: string;
  readOnly: boolean;
  shared: boolean;
  pulse: number;
  me: string;
  fromHost: boolean;
  onStorage: () => void;
  onName: () => void;
}

function TopBar({ storeLabel, readOnly, shared, pulse, me, fromHost, onStorage, onName }: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="mark" aria-hidden="true" />
        <span>Chore rota</span>
      </div>
      <div className="topbar-right">
        <LivePill pulse={pulse} shared={shared} />
        <button type="button" className="pill" onClick={onStorage} title="Change where the rota is stored">
          <span className="pill-k">{shared ? 'Shared' : 'Private'}</span>
          <span className="pill-v">
            {storeLabel}
            {readOnly ? ' · read-only' : ''}
          </span>
        </button>
        <button
          type="button"
          className="pill"
          onClick={fromHost ? undefined : onName}
          disabled={fromHost}
          title={fromHost ? 'Signed in on immediately.run' : 'Set the name shown on your claims'}
        >
          <span className="pill-k">You</span>
          <span className="pill-v">{me || 'set name'}</span>
        </button>
        <ThemeSwitch />
      </div>
    </header>
  );
}

export default TopBar;
