import { useState } from 'react';
import Modal from './Modal';

interface Props {
  initial: string;
  reason?: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

function NameDialog({ initial, reason, onSave, onClose }: Props) {
  const [name, setName] = useState(initial);
  return (
    <Modal title="Your name" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(name);
          onClose();
        }}
      >
        {reason && <p className="error">{reason}</p>}
        <p className="muted">Shown next to your claims, done-marks, and swaps. On immediately.run your login is used automatically when you are signed in.</p>
        <label className="field">
          <span>Name</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Sam" />
        </label>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default NameDialog;
