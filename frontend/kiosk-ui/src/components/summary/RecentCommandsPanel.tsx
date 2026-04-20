import React, { useMemo } from "react";
import { KioskCommand } from "../../types/command";

interface Props {
  commands: KioskCommand[];
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
  onSelectMachine?: (machineName: string) => void;
  limit?: number;
}

const formatRelative = (iso: string | null): string => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

const statusVariant = (
  status: string
): "ok" | "error" | "info" | "warning" | "neutral" => {
  const s = status.toLowerCase();
  if (s === "completed") return "ok";
  if (s === "failed") return "error";
  if (s === "running") return "info";
  if (s === "pending") return "warning";
  return "neutral";
};

const RecentCommandsPanel: React.FC<Props> = ({
  commands,
  loading,
  error,
  onRetry,
  onSelectMachine,
  limit = 15,
}) => {
  const sorted = useMemo(
    () =>
      [...commands]
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, limit),
    [commands, limit]
  );

  const failedCount = useMemo(
    () => sorted.filter((c) => c.status.toLowerCase() === "failed").length,
    [sorted]
  );

  const inProgressCount = useMemo(
    () =>
      sorted.filter((c) => {
        const s = c.status.toLowerCase();
        return s === "pending" || s === "running";
      }).length,
    [sorted]
  );

  return (
    <section className="issues-panel">
      <header className="issues-panel__head">
        <h3 className="issues-panel__title">Recent commands</h3>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {failedCount > 0 && (
            <span
              className="issues-panel__badge"
              style={{
                background: "rgba(239,68,68,0.15)",
                color: "#fca5a5",
              }}
            >
              {failedCount} failed
            </span>
          )}
          {inProgressCount > 0 && (
            <span
              className="issues-panel__badge"
              style={{
                background: "rgba(245,158,11,0.15)",
                color: "#fcd34d",
              }}
            >
              {inProgressCount} active
            </span>
          )}
          <span className="issues-panel__count">
            {loading && commands.length === 0 ? "—" : sorted.length}
          </span>
        </div>
      </header>

      {loading && commands.length === 0 ? (
        <div className="issues-panel__empty">Loading commands…</div>
      ) : error ? (
        <div className="issues-panel__empty">
          {error}
          {onRetry && (
            <button
              className="btn btn--ghost"
              onClick={onRetry}
              style={{ marginLeft: 8, fontSize: 12, padding: "2px 8px" }}
            >
              Retry
            </button>
          )}
        </div>
      ) : sorted.length === 0 ? (
        <div className="issues-panel__empty">
          No commands sent in the last poll window.
        </div>
      ) : (
        <ul className="issues-list">
          {sorted.map((c) => {
            const variant = statusVariant(c.status);
            return (
              <li
                key={c.id}
                className={`issues-list__item${
                  variant === "error" ? " issues-list__item--cmd" : ""
                }`}
                onClick={() => onSelectMachine?.(c.machineName)}
              >
                <div className="issues-list__row">
                  <span className="issues-list__machine">{c.machineName}</span>
                  <span className="issues-list__time">
                    {formatRelative(c.createdAt)}
                  </span>
                </div>
                <div className="issues-list__meta">
                  <code className="cmd-type">{c.type}</code>
                  <span
                    className={`check-badge check-badge--${variant} log-level log-level--${variant}`}
                  >
                    <span className="check-badge__dot" />
                    {c.status}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default RecentCommandsPanel;
