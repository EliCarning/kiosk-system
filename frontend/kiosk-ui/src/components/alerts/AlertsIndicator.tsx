import React, { useEffect, useRef, useState } from "react";
import { useAlerts } from "../../context/AlertsContext";
import AlertsPanel from "./AlertsPanel";

const AlertsIndicator: React.FC = () => {
  const { alerts } = useAlerts();
  const [open, setOpen] = useState<boolean>(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const count = alerts.length;

  useEffect(() => {
    if (!open) return;
    const onDocClick = (event: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="alerts-indicator" ref={wrapperRef}>
      <button
        type="button"
        className="btn btn--ghost alerts-indicator__btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Alerts (${count} active)`}
      >
        <span>Alerts</span>
        {count > 0 && (
          <span className="alerts-indicator__badge">{count}</span>
        )}
      </button>
      {open && <AlertsPanel onClose={() => setOpen(false)} />}
    </div>
  );
};

export default AlertsIndicator;
