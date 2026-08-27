interface Props {
  message: string;
  onClose: () => void;
}

function Toast({ message, onClose }: Props) {
  return (
    <div className="toast" role="alert">
      <span>{message}</span>
      <button type="button" className="iconbtn" aria-label="Dismiss" onClick={onClose}>
        ✕
      </button>
    </div>
  );
}

export default Toast;
