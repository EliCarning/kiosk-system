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

type Tab = "active" | "history";

const POLL_MS = 15000;

const formatTime = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const AlertsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("active");
  const [active, setActive] = useState<Alert[]>([]);
  const [history, setHistory] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

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
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(load, POLL_MS);
    const unsub = subscribeRealtime(RealtimeEvents.AlertCreated, () => load());
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [load]);

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

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await resolveAlert(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to resolve alert");
    } finally {
      setResolvingId(null);
    }
  };

  const goToKiosk = (machineName: string) => {
    if (!machineName) return;
    navigate(`/kiosks/${encodeURIComponent(machineName)}`);
  };

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
            Refresh
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
            title={tab === "active" ? "No active alerts" : "No alert history"}
            message={
              search || typeFilter !== "all"
                ? "Adjust filters to see more results."
                : tab === "active"
                ? "All clear — no active alerts right now."
                : "No resolved alerts yet."
            }
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
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
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
                          {a.resolvedAt ? formatTime(a.resolvedAt) : "Resolved"}
                        </span>
                      ) : (
                        <span className="pill pill--warn">Active</span>
                      )}
                    </td>
                    <td className="td-right">
                      {!a.isResolved && (
                        <button
                          className="btn btn--sm"
                          disabled={resolvingId === a.id}
                          onClick={() => handleResolve(a.id)}
                        >
                          {resolvingId === a.id ? "Resolving…" : "Resolve"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default AlertsPage;
