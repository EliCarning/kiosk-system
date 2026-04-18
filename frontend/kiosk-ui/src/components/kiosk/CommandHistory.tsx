import React from "react";
import { KioskCommand } from "../../types/command";

interface CommandHistoryProps {
  commands: KioskCommand[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

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
  return "warning";
};

const CommandHistory: React.FC<CommandHistoryProps> = ({
  commands,
  loading,
  error,
  onRetry,
}) => {
  if (loading && commands.length === 0) {
    return <div className="cmd-history__hint">Loading commands...</div>;
  }
  if (error) {
    return (
      <div className="cmd-history__hint cmd-history__hint--error">
        <span>{error}</span>
        <button className="btn btn--ghost" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }
  if (commands.length === 0) {
    return (
      <div className="cmd-history__hint">No commands sent to this machine.</div>
    );
  }

  return (
    <ul className="cmd-history">
      {commands.map((c) => {
        const variant = statusVariant(c.status);
        return (
          <li key={c.id} className="cmd-history__row">
            <div className="cmd-history__main">
              <span className="cmd-history__type">{c.type}</span>
              <span
                className={`check-badge check-badge--${variant} log-level log-level--${variant}`}
              >
                <span className="check-badge__dot" />
                {c.status}
              </span>
            </div>
            <div className="cmd-history__meta">
              <span>created {formatDate(c.createdAt)}</span>
              {c.completedAt && (
                <span> · done {formatDate(c.completedAt)}</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default CommandHistory;
