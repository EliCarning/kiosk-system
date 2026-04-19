import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, fetchAlertHistory } from "../../api/alerts";
import { useAlerts } from "../../context/AlertsContext";
import { useCan } from "../../context/PermissionsContext";

interface AlertsPanelProps {
  onClose: () => void;
}

type TabKey = "active" | "history";

const formatTime = (iso: string): string => {
  if (!iso) return "";
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

  const [tab, setTab] = useState<TabKey>("active");
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  const [history, setHistory] = useState<Alert[]>([]);
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const data = await fetchAlertHistory();
      setHistory(data);
    } catch (err) {
      setHistoryError(
        err instanceof Error ? err.message : "Unable to load alert history"
      );
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "history") {
      loadHistory();
    }
  }, [tab, loadHistory]);

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

  const handleRefresh = () => {
    if (tab === "active") {
      refresh();
    } else {
      loadHistory();
    }
  };

  const activeList = alerts;
  const showingLoading = tab === "active" ? loading : historyLoading;
  const showingError = tab === "active" ? error : historyError;

  const renderItems = (items: Alert[], showResolve: boolean) => {
    if (items.length === 0 && !showingLoading && !showingError) {
      return (
        <div className="alerts-panel__empty">
          {tab === "active" ? "No active alerts." : "No alert history."}
        </div>
      );
    }
    return items.map((alert) => (
      <button
        key={alert.id}
        type="button"
        className="alerts-panel__item"
        onClick={() => handleNavigate(alert)}
      >
        <div className="alerts-panel__item-head">
          <span className="alerts-panel__machine">{alert.machineName}</span>
          <span
            className={`check-badge ${
              alert.isResolved ? "check-badge--ok" : "check-badge--warning"
            }`}
          >
            {alert.type}
            {alert.isResolved ? " · resolved" : ""}
          </span>
        </div>
        <div className="alerts-panel__message">{alert.message}</div>
        <div className="alerts-panel__meta">
          <span>{formatTime(alert.createdAt)}</span>
          {showResolve && !alert.isResolved && can.operate && (
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
    ));
  };

  return (
    <div className="alerts-panel" role="dialog" aria-label="Alerts">
      <div className="alerts-panel__head">
        <span className="alerts-panel__title">Alerts</span>
        <div className="alerts-panel__head-actions">
          <button
            className="btn btn--ghost"
            onClick={handleRefresh}
            disabled={showingLoading}
          >
            {showingLoading ? "..." : "Refresh"}
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

      <div className="alerts-panel__tabs">
        <button
          type="button"
          className={`alerts-panel__tab ${
            tab === "active" ? "alerts-panel__tab--active" : ""
          }`}
          onClick={() => setTab("active")}
        >
          Active ({activeList.length})
        </button>
        <button
          type="button"
          className={`alerts-panel__tab ${
            tab === "history" ? "alerts-panel__tab--active" : ""
          }`}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>

      <div className="alerts-panel__body">
        {showingError && (
          <div className="alerts-panel__error">{showingError}</div>
        )}
        {resolveError && (
          <div className="alerts-panel__error">{resolveError}</div>
        )}

        {tab === "active"
          ? renderItems(activeList, true)
          : renderItems(history, false)}
      </div>
    </div>
  );
};

export default AlertsPanel;
