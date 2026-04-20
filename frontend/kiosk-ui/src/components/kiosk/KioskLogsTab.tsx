import React, { useMemo, useState } from "react";
import { MachineLog } from "../../types/log";

interface KioskLogsTabProps {
  logs: MachineLog[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

type LevelFilter = "all" | "info" | "warning" | "error";

const formatLogTime = (iso: string): string => {
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

const levelToVariant = (level: string): string => {
  const n = level.toLowerCase();
  if (n === "error") return "error";
  if (n === "warning" || n === "warn") return "warning";
  if (n === "info") return "info";
  return "neutral";
};

const KioskLogsTab: React.FC<KioskLogsTabProps> = ({
  logs,
  loading,
  error,
  onRetry,
}) => {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  const [query, setQuery] = useState<string>("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return logs.filter((l) => {
      if (levelFilter !== "all") {
        const v = levelToVariant(l.level);
        if (v !== levelFilter) return false;
      }
      if (!needle) return true;
      return l.message.toLowerCase().includes(needle);
    });
  }, [logs, levelFilter, query]);

  const renderBody = () => {
    if (loading && logs.length === 0) {
      return <div className="details-panel__hint">Loading logs…</div>;
    }
    if (error) {
      return (
        <div className="details-panel__hint details-panel__hint--error">
          <span>{error}</span>
          <button className="btn btn--ghost" onClick={onRetry}>
            Retry
          </button>
        </div>
      );
    }
    if (logs.length === 0) {
      return (
        <div className="details-panel__empty">
          <div className="details-panel__empty-title">No logs yet</div>
          <div className="details-panel__empty-msg">
            Logs will appear here once available.
          </div>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <div className="details-panel__hint">
          No logs match the current filter.
        </div>
      );
    }
    return (
      <ul className="kiosk-logs">
        {filtered.map((log, idx) => (
          <li key={`${log.timestamp}-${idx}`} className="kiosk-logs__row">
            <div className="kiosk-logs__main">
              <span
                className={`log-level log-level--${levelToVariant(log.level)}`}
              >
                {log.level}
              </span>
              <span className="kiosk-logs__msg">{log.message}</span>
            </div>
            <div className="kiosk-logs__meta">
              {formatLogTime(log.timestamp)}
            </div>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="kiosk-tab-pane">
      <div className="kiosk-logs__toolbar">
        <input
          className="input"
          placeholder="Search log messages…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="select"
          value={levelFilter}
          onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
          aria-label="Filter by level"
        >
          <option value="all">All levels</option>
          <option value="info">Info</option>
          <option value="warning">Warning</option>
          <option value="error">Error</option>
        </select>
      </div>
      {renderBody()}
    </div>
  );
};

export default KioskLogsTab;
