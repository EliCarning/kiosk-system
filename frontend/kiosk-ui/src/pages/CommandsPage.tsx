import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createCommand } from "../api/actions";
import { fetchRecentCommands } from "../api/commands";
import { KioskCommand } from "../types/command";
import StateView from "../components/StateView";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";
import { usePolling } from "../hooks/usePolling";

const POLL_MS = 8000;
const STATUSES = ["all", "Pending", "Running", "Completed", "Failed"] as const;
type StatusChip = (typeof STATUSES)[number];

const RETRY_FEEDBACK_MS = 3500;

interface RetryFeedback {
  phase: "success" | "error";
  message: string;
}

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
  if (s === "pending") return "pill pill--warn";
  return "pill";
};

const CommandsPage: React.FC = () => {
  const navigate = useNavigate();
  const [commands, setCommands] = useState<KioskCommand[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusChip>("all");
  const [search, setSearch] = useState<string>("");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retriedIds, setRetriedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<RetryFeedback | null>(null);

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
  }, [status]);

  usePolling(load, { intervalMs: POLL_MS });

  useEffect(() => {
    const unsub = subscribeRealtime(RealtimeEvents.CommandUpdated, () =>
      load()
    );
    return () => unsub();
  }, [load]);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), RETRY_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const base = !needle
      ? commands
      : commands.filter(
          (c) =>
            c.machineName.toLowerCase().includes(needle) ||
            c.type.toLowerCase().includes(needle)
        );
    return [...base].sort((a, b) => {
      const at = new Date(a.createdAt).getTime() || 0;
      const bt = new Date(b.createdAt).getTime() || 0;
      return bt - at;
    });
  }, [commands, search]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: commands.length };
    commands.forEach((c) => {
      out[c.status] = (out[c.status] ?? 0) + 1;
    });
    return out;
  }, [commands]);

  const handleRetry = useCallback(
    async (cmd: KioskCommand) => {
      if (retryingId) return;
      setRetryingId(cmd.id);
      try {
        await createCommand(cmd.machineName, cmd.type, cmd.payload ?? "");
        setRetriedIds((prev) => {
          const next = new Set(prev);
          next.add(cmd.id);
          return next;
        });
        setFeedback({
          phase: "success",
          message: `Re-queued ${cmd.type} on ${cmd.machineName}`,
        });
        await load();
      } catch (err) {
        setFeedback({
          phase: "error",
          message:
            err instanceof Error
              ? err.message
              : `Retry failed for ${cmd.machineName}`,
        });
      } finally {
        setRetryingId(null);
      }
    },
    [retryingId, load]
  );

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
            {loading ? "Refreshing…" : "Refresh"}
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
                  <th>Issued By</th>
                  <th>Created</th>
                  <th>Completed</th>
                  <th className="td-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const isFailed = c.status.toLowerCase() === "failed";
                  const isRetrying = retryingId === c.id;
                  const alreadyRetried = retriedIds.has(c.id);
                  return (
                    <tr
                      key={c.id}
                      className={
                        isFailed ? "table__row table__row--failed" : undefined
                      }
                    >
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
                      <td>
                        <code className="cmd-type">{c.type}</code>
                      </td>
                      <td className="td-nowrap td-muted">
                        {c.issuedByDisplayName || c.issuedByUsername || "—"}
                      </td>
                      <td className="td-nowrap">{formatTime(c.createdAt)}</td>
                      <td className="td-nowrap">
                        {formatTime(c.completedAt)}
                      </td>
                      <td className="td-right">
                        {isFailed ? (
                          <button
                            className={`btn btn--sm${
                              isRetrying ? " is-loading" : ""
                            }`}
                            onClick={() => handleRetry(c)}
                            disabled={retryingId !== null}
                            aria-busy={isRetrying}
                            title={
                              alreadyRetried
                                ? "This command was retried — a new attempt is in progress."
                                : "Re-send this command"
                            }
                          >
                            {isRetrying
                              ? "Retrying…"
                              : alreadyRetried
                              ? "Retry again"
                              : "Retry"}
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

export default CommandsPage;
