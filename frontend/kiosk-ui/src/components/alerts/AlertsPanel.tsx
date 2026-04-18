import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../../api/alerts";
import { useAlerts } from "../../context/AlertsContext";
import { useCan } from "../../context/PermissionsContext";

interface AlertsPanelProps {
  onClose: () => void;
}

const formatTime = (iso: string): string => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ onClose }) => {
  const { alerts, loading, error, refresh, resolve } = useAlerts();
  const navigate = useNavigate();
  const can = useCan();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const handleNavigate = (alert: Alert) => {
    onClose();
    navigate(`/machines/${encodeURIComponent(alert.machineName)}`);
  };

  const handleResolve = async (
    event: React.MouseEvent,
    alert: Alert
  ): Promise<void> => {
    event.stopPropagation();
    setResolvingId(alert.id);
    setResolveError(null);
    try {
      await resolve(alert.id);
    } catch (err) {
      setResolveError(
        err instanceof Error ? err.message : "Unable to resolve alert"
      );
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="alerts-panel" role="dialog" aria-label="Active alerts">
      <div className="alerts-panel__head">
        <span className="alerts-panel__title">Active alerts</span>
        <div className="alerts-panel__head-actions">
          <button
            className="btn btn--ghost"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? "..." : "Refresh"}
          </button>
          <button
            className="btn btn--ghost"
            onClick={onClose}
            aria-label="Close alerts panel"
          >
            Close
          </button>
        </div>
      </div>

      <div className="alerts-panel__body">
        {error && (
          <div className="alerts-panel__error">{error}</div>
        )}
        {resolveError && (
          <div className="alerts-panel__error">{resolveError}</div>
        )}

        {alerts.length === 0 && !loading && !error && (
          <div className="alerts-panel__empty">No active alerts.</div>
        )}

        {alerts.map((alert) => (
          <button
            key={alert.id}
            type="button"
            className="alerts-panel__item"
            onClick={() => handleNavigate(alert)}
          >
            <div className="alerts-panel__item-head">
              <span className="alerts-panel__machine">{alert.machineName}</span>
              <span className="check-badge check-badge--warning">
                {alert.type}
              </span>
            </div>
            <div className="alerts-panel__message">{alert.message}</div>
            <div className="alerts-panel__meta">
              <span>{formatTime(alert.createdAt)}</span>
              {can.operate && (
                <span
                  className="btn btn--ghost alerts-panel__resolve"
                  role="button"
                  aria-label={`Resolve ${alert.type} alert for ${alert.machineName}`}
                  onClick={(e) => handleResolve(e, alert)}
                >
                  {resolvingId === alert.id ? "Resolving..." : "Resolve"}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AlertsPanel;
