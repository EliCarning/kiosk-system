import React, { useState } from "react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [pollSeconds, setPollSeconds] = useState<number>(5);
  const [apiBase, setApiBase] = useState<string>(
    process.env.REACT_APP_API_BASE_URL || "http://localhost:5226"
  );

  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <header className="modal__head">
          <div className="modal__title">Settings</div>
          <button className="btn btn--ghost" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="modal__body">
          <label className="field">
            <span className="field__label">API base URL</span>
            <input
              className="input"
              value={apiBase}
              onChange={(e) => setApiBase(e.target.value)}
            />
            <span className="field__hint">
              Configured via REACT_APP_API_BASE_URL at build time.
            </span>
          </label>

          <label className="field">
            <span className="field__label">Poll interval (seconds)</span>
            <input
              className="input"
              type="number"
              min={2}
              max={60}
              value={pollSeconds}
              onChange={(e) => setPollSeconds(Number(e.target.value))}
            />
          </label>
        </div>

        <footer className="modal__foot">
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn btn--primary" onClick={onClose}>
            Save
          </button>
        </footer>
      </div>
    </div>
  );
};

export default SettingsModal;
