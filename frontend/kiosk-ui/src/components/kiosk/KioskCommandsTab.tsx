import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createCommand } from "../../api/actions";
import { KioskCommand } from "../../types/command";

interface KioskCommandsTabProps {
  commands: KioskCommand[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const RETRY_FEEDBACK_MS = 3500;

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const statusVariant = (status: string): string => {
  const s = status.toLowerCase();
  if (s === "completed") return "ok";
  if (s === "failed") return "error";
  if (s === "running") return "info";
  if (s === "pending") return "warning";
  return "neutral";
};

interface Feedback {
  phase: "success" | "error";
  message: string;
}

const KioskCommandsTab: React.FC<KioskCommandsTabProps> = ({
  commands,
  loading,
  error,
  onRetry,
}) => {
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retriedIds, setRetriedIds] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const sorted = useMemo(() => {
    return [...commands].sort((a, b) => {
      const at = new Date(a.createdAt).getTime() || 0;
      const bt = new Date(b.createdAt).getTime() || 0;
      return bt - at;
    });
  }, [commands]);

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), RETRY_FEEDBACK_MS);
    return () => window.clearTimeout(id);
  }, [feedback]);

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
          message: `Re-queued ${cmd.type}`,
        });
        onRetry();
      } catch (err) {
        setFeedback({
          phase: "error",
          message:
            err instanceof Error ? err.message : "Retry failed",
        });
      } finally {
        setRetryingId(null);
      }
    },
    [retryingId, onRetry]
  );

  if (loading && commands.length === 0) {
    return (
      <div className="kiosk-tab-pane">
        <div className="details-panel__hint">Loading commands…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="kiosk-tab-pane">
        <div className="details-panel__hint details-panel__hint--error">
          <span>{error}</span>
          <button className="btn btn--ghost" onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  if (sorted.length === 0) {
    return (
      <div className="kiosk-tab-pane">
        <div className="details-panel__empty">
          <div className="details-panel__empty-title">No commands yet</div>
          <div className="details-panel__empty-msg">
            Commands sent to this kiosk will show up here in real time.
          </div>
        </div>
      </div>
    );
  }

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
      <div className="cmd-table-wrap">
        <table className="cmd-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Status</th>
              <th>Created</th>
              <th>Completed</th>
              <th className="td-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => {
              const variant = statusVariant(c.status);
              const isFailed = variant === "error";
              const isRetrying = retryingId === c.id;
              const alreadyRetried = retriedIds.has(c.id);
              return (
                <tr
                  key={c.id}
                  className={`cmd-table__row${
                    isFailed ? " cmd-table__row--failed" : ""
                  }`}
                >
                  <td>
                    <code className="cmd-table__type">{c.type}</code>
                  </td>
                  <td>
                    <span
                      className={`check-badge check-badge--${variant} log-level log-level--${variant}`}
                    >
                      <span className="check-badge__dot" />
                      {c.status}
                    </span>
                  </td>
                  <td className="td-nowrap">{formatDate(c.createdAt)}</td>
                  <td className="td-nowrap">{formatDate(c.completedAt)}</td>
                  <td className="td-right">
                    {isFailed ? (
                      <button
                        className={`btn btn--sm${
                          isRetrying ? " is-loading" : ""
                        }`}
                        onClick={() => handleRetry(c)}
                        disabled={retryingId !== null}
                        aria-busy={isRetrying}
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
    </div>
  );
};

export default KioskCommandsTab;
