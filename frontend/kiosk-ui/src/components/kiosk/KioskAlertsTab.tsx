import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  fetchAlerts,
  fetchAlertHistory,
  resolveAlert,
} from "../../api/alerts";
import Tabs, { TabDef } from "../Tabs";

interface KioskAlertsTabProps {
  machineName: string;
}

type AlertTabId = "active" | "history";

const POLL_MS = 10000;
const FEEDBACK_MS = 3500;

const formatTime = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

interface Feedback {
  phase: "success" | "error";
  message: string;
}

const KioskAlertsTab: React.FC<KioskAlertsTabProps> = ({ machineName }) => {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [historyAlerts, setHistoryAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [alertTab, setAlertTab] = useState<AlertTabId>("active");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, h] = await Promise.all([fetchAlerts(), fetchAlertHistory()]);
      setActiveAlerts(a.filter((al) => al.machineName === machineName));
      setHistoryAlerts(h.filter((al) => al.machineName === machineName));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load alerts");
    } finally {
      setLoading(false);
    }
  }, [machineName]);

  useEffect(() => {
    setLoading(true);
    void load();
    const id = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const handleResolve = useCallback(
    async (alert: Alert) => {
      if (resolvingIds.has(alert.id)) return;

      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.add(alert.id);
        return next;
      });

      const prevActive = activeAlerts;
      const prevHistory = historyAlerts;
      const resolved: Alert = {
        ...alert,
        isResolved: true,
        resolvedAt: new Date().toISOString(),
      };
      setActiveAlerts((list) => list.filter((a) => a.id !== alert.id));
      setHistoryAlerts((list) => [resolved, ...list]);

      try {
        await resolveAlert(alert.id);
        setFeedback({ phase: "success", message: `Resolved: ${alert.type}` });
        void load();
      } catch (err) {
        setActiveAlerts(prevActive);
        setHistoryAlerts(prevHistory);
        setFeedback({
          phase: "error",
          message: err instanceof Error ? err.message : "Failed to resolve",
        });
      } finally {
        setResolvingIds((prev) => {
          const next = new Set(prev);
          next.delete(alert.id);
          return next;
        });
      }
    },
    [resolvingIds, activeAlerts, historyAlerts, load]
  );

  const source = alertTab === "active" ? activeAlerts : historyAlerts;

  const alertTabs: TabDef<AlertTabId>[] = [
    {
      id: "active",
      label: "Active",
      badge: activeAlerts.length > 0 ? activeAlerts.length : undefined,
    },
    {
      id: "history",
      label: "History",
      badge: historyAlerts.length > 0 ? historyAlerts.length : undefined,
    },
  ];

  const renderList = () => {
    if (loading && activeAlerts.length === 0 && historyAlerts.length === 0) {
      return <div className="details-panel__hint">Loading alerts…</div>;
    }
    if (error) {
      return (
        <div className="details-panel__hint details-panel__hint--error">
          <span>{error}</span>
          <button className="btn btn--ghost" onClick={load}>
            Retry
          </button>
        </div>
      );
    }
    if (source.length === 0) {
      return (
        <div className="details-panel__empty">
          <div className="details-panel__empty-title">
            {alertTab === "active" ? "No active alerts" : "No alert history"}
          </div>
          <div className="details-panel__empty-msg">
            {alertTab === "active"
              ? "All clear — no active alerts for this kiosk."
              : "No resolved alerts for this kiosk yet."}
          </div>
        </div>
      );
    }

    return (
      <ul className="kiosk-alerts">
        {source.map((a) => {
          const isResolving = resolvingIds.has(a.id);
          return (
            <li key={a.id} className="kiosk-alerts__row">
              <div className="kiosk-alerts__head">
                <span className="kiosk-alerts__type">{a.type}</span>
                <span className="kiosk-alerts__time">
                  {formatTime(a.createdAt)}
                </span>
              </div>
              <div className="kiosk-alerts__msg">{a.message}</div>
              <div className="kiosk-alerts__head">
                {a.isResolved ? (
                  <>
                    <span className="pill pill--ok">Resolved</span>
                    {a.resolvedAt && (
                      <span className="kiosk-alerts__time">
                        {formatTime(a.resolvedAt)}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="pill pill--warn">Active</span>
                    <button
                      className={`btn btn--sm${isResolving ? " is-loading" : ""}`}
                      disabled={isResolving}
                      aria-busy={isResolving}
                      onClick={() => handleResolve(a)}
                    >
                      {isResolving ? "Resolving…" : "Resolve"}
                    </button>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="kiosk-tab-pane">
      {feedback && (
        <div
          role="status"
          className={`cmd-feedback cmd-feedback--${feedback.phase}`}
        >
          {feedback.message}
        </div>
      )}
      <Tabs<AlertTabId>
        tabs={alertTabs}
        active={alertTab}
        onChange={setAlertTab}
        ariaLabel="Alert history sections"
      />
      {renderList()}
    </div>
  );
};

export default KioskAlertsTab;
