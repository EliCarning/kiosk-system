import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRecentCommands } from "../api/commands";
import { KioskCommand } from "../types/command";
import StateView from "../components/StateView";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";

const POLL_MS = 15000;
const STATUSES = ["all", "Pending", "Running", "Completed", "Failed"] as const;
type StatusChip = (typeof STATUSES)[number];

const formatTime = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const statusPillClass = (status: string): string => {
  const s = status.toLowerCase();
  if (s === "completed") return "pill pill--ok";
  if (s === "failed") return "pill pill--err";
  if (s === "running") return "pill pill--info";
  return "pill pill--warn";
};

const CommandsPage: React.FC = () => {
  const navigate = useNavigate();
  const [commands, setCommands] = useState<KioskCommand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusChip>("all");
  const [search, setSearch] = useState<string>("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchRecentCommands({
        status: status === "all" ? undefined : status,
        limit: 200,
      });
      setCommands(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load commands");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(load, POLL_MS);
    const unsub = subscribeRealtime(RealtimeEvents.CommandUpdated, () =>
      load()
    );
    return () => {
      window.clearInterval(id);
      unsub();
    };
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return commands;
    return commands.filter(
      (c) =>
        c.machineName.toLowerCase().includes(needle) ||
        c.type.toLowerCase().includes(needle)
    );
  }, [commands, search]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: commands.length };
    commands.forEach((c) => {
      out[c.status] = (out[c.status] ?? 0) + 1;
    });
    return out;
  }, [commands]);

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Commands</h1>
          <div className="page__subtitle">
            Recent commands dispatched across the estate
          </div>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <div className="page__filters">
        <div className="chips">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`chip${status === s ? " is-active" : ""}`}
              onClick={() => setStatus(s)}
            >
              {s === "all" ? "All" : s}
              {counts[s] !== undefined && (
                <span className="chip__count">{counts[s]}</span>
              )}
            </button>
          ))}
        </div>
        <input
          className="input"
          placeholder="Search machine or type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section className="page__body">
        {loading && commands.length === 0 ? (
          <StateView
            variant="loading"
            title="Loading commands"
            message="Fetching recent commands..."
          />
        ) : error ? (
          <StateView
            variant="error"
            title="Unable to load commands"
            message={error}
            onRetry={load}
          />
        ) : filtered.length === 0 ? (
          <StateView
            variant="empty"
            title="No commands"
            message={
              search || status !== "all"
                ? "Adjust filters to see more results."
                : "No commands have been dispatched yet."
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Machine</th>
                  <th>Type</th>
                  <th>Created</th>
                  <th>Completed</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <span className={statusPillClass(c.status)}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <button
                        className="linklike"
                        onClick={() =>
                          navigate(
                            `/kiosks/${encodeURIComponent(c.machineName)}`
                          )
                        }
                      >
                        {c.machineName}
                      </button>
                    </td>
                    <td>{c.type}</td>
                    <td className="td-nowrap">{formatTime(c.createdAt)}</td>
                    <td className="td-nowrap">{formatTime(c.completedAt)}</td>
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

export default CommandsPage;
