import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  fetchAlertHistory,
  fetchAlerts,
  resolveAlert,
} from "../api/alerts";
import StateView from "../components/StateView";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";
import { usePolling } from "../hooks/usePolling";

type Tab = "active" | "history";

const POLL_MS = 8000;
const FEEDBACK_MS = 3500;

const formatTime = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

interface Feedback {
  phase: "success" | "error";
  message: string;
}

const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const [active, setActive] = useState<Alert[]>([]);
  const [history, setHistory] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [resolvingIds, setResolvingIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, h] = await Promise.all([fetchAlerts(), fetchAlertHistory()]);
      setActive(a);
      setHistory(h);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
  }, []);

  usePolling(load, { intervalMs: POLL_MS });

  useEffect(() => {
    const unsub = subscribeRealtime(RealtimeEvents.AlertCreated, () => load());
    return () => unsub();
  }, [load]);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const source = tab === "active" ? active : history;

  const types = useMemo(() => {
    const set = new Set<string>();
    source.forEach((a) => a.type && set.add(a.type));
    return Array.from(set).sort();
  }, [source]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return source.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (!needle) return true;
      return (
        a.machineName.toLowerCase().includes(needle) ||
        a.message.toLowerCase().includes(needle) ||
        a.type.toLowerCase().includes(needle)
      );
    });
  }, [source, search, typeFilter]);

  const handleResolve = async (alert: Alert) => {
    if (resolvingIds.has(alert.id)) return;

    setResolvingIds((prev) => {
      const next = new Set(prev);
      next.add(alert.id);
      return next;
    });

    const previousActive = active;
    const previousHistory = history;
    const optimisticResolved: Alert = {
      ...alert,
      isResolved: true,
      resolvedAt: new Date().toISOString(),
    };
    setActive((list) => list.filter((a) => a.id !== alert.id));
    setHistory((list) => [optimisticResolved, ...list]);

    try {
      await resolveAlert(alert.id);
      setFeedback({
        phase: "success",
        message: `Resolved ${alert.type} on ${alert.machineName}`,
      });
      load();
    } catch (err) {
      setActive(previousActive);
      setHistory(previousHistory);
      setFeedback({
        phase: "error",
        message:
          err instanceof Error ? err.message : "Unable to resolve alert",
      });
    } finally {
      setResolvingIds((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }
  };

  const goToKiosk = (machineName: string) => {
    if (!machineName) return;
    navigate(`/kiosks/${encodeURIComponent(machineName)}`);
  };

  const emptyTitle = tab === "active" ? "No active alerts" : "No alert history";
  const emptyMessage =
    search || typeFilter !== "all"
      ? "Adjust filters to see more results."
      : tab === "active"
      ? "All clear — no active alerts right now."
      : "No resolved alerts yet.";

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Alerts</h1>
          <div className="page__subtitle">
            {active.length} active · {history.length} in history
          </div>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={load} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      <div className="page__tabs">
        <button
          className={`tab${tab === "active" ? " is-active" : ""}`}
          onClick={() => setTab("active")}
        >
          Active ({active.length})
        </button>
        <button
          className={`tab${tab === "history" ? " is-active" : ""}`}
          onClick={() => setTab("history")}
        >
          History ({history.length})
        </button>
      </div>

      <div className="page__filters">
        <input
          className="input"
          placeholder="Search machine, type, or message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {feedback && (
        <div
          role="status"
          className={`cmd-feedback cmd-feedback--${feedback.phase}`}
        >
          {feedback.message}
          <button
            type="button"
            className="linklike"
            onClick={() => setFeedback(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="page__body">
        {loading && source.length === 0 ? (
          <StateView
            variant="loading"
            title="Loading alerts"
            message="Fetching alerts from backend..."
          />
        ) : error ? (
          <StateView
            variant="error"
            title="Unable to load alerts"
            message={error}
            onRetry={load}
          />
        ) : filtered.length === 0 ? (
          <StateView
            variant="empty"
            title={emptyTitle}
            message={emptyMessage}
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Machine</th>
                  <th>Message</th>
                  <th>Created</th>
                  <th>{tab === "active" ? "Status" : "Resolved"}</th>
                  <th className="td-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const isResolving = resolvingIds.has(a.id);
                  return (
                    <tr key={a.id}>
                      <td>
                        <span className="pill pill--warn">{a.type}</span>
                      </td>
                      <td>
                        <button
                          className="linklike"
                          onClick={() => goToKiosk(a.machineName)}
                        >
                          {a.machineName}
                        </button>
                      </td>
                      <td className="td-message">{a.message}</td>
                      <td className="td-nowrap">{formatTime(a.createdAt)}</td>
                      <td className="td-nowrap">
                        {a.isResolved ? (
                          <span className="pill pill--ok">
                            {a.resolvedAt
                              ? formatTime(a.resolvedAt)
                              : "Resolved"}
                          </span>
                        ) : (
                          <span className="pill pill--warn">Active</span>
                        )}
                      </td>
                      <td className="td-right">
                        {!a.isResolved ? (
                          <button
                            className={`btn btn--sm${
                              isResolving ? " is-loading" : ""
                            }`}
                            disabled={isResolving}
                            aria-busy={isResolving}
                            onClick={() => handleResolve(a)}
                          >
                            {isResolving ? "Resolving…" : "Resolve"}
                          </button>
                        ) : (
                          <span className="td-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AlertsPage;
