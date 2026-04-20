import React, { useCallback, useEffect, useMemo, useState } from "react";
import { EventLogEntry, EventLogFilter } from "../../types/systemInfo";
import { fetchEventLogs } from "../../api/systemInfo";
import { CommandType } from "../../types/command";
import { ActionFeedback } from "../../hooks/useKioskActions";
import { useCan } from "../../context/PermissionsContext";

interface KioskEventLogsTabProps {
  machineName: string;
  pending: CommandType | null;
  feedback: ActionFeedback | null;
  onTrigger: (type: CommandType, label: string, payload?: string) => void;
}

const POLL_MS = 15000;

const formatTime = (iso: string): string => {
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

const levelVariant = (level: string): string => {
  const l = level.toLowerCase();
  if (l === "error" || l === "failureaudit") return "error";
  if (l === "warning") return "warning";
  if (l === "information" || l === "successaudit") return "ok";
  return "neutral";
};

const KioskEventLogsTab: React.FC<KioskEventLogsTabProps> = ({
  machineName,
  pending,
  feedback,
  onTrigger,
}) => {
  const can = useCan();
  const [entries, setEntries] = useState<EventLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [logName, setLogName] = useState<string>("all");
  const [level, setLevel] = useState<string>("all");
  const [hoursBack, setHoursBack] = useState<number>(24);
  const [maxResults, setMaxResults] = useState<number>(50);
  const [levelViewFilter, setLevelViewFilter] = useState<string>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchEventLogs(machineName, 200);
      setEntries(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load event logs");
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

  const visible = useMemo(() => {
    return entries.filter((e) => {
      if (levelViewFilter !== "all" && e.level.toLowerCase() !== levelViewFilter) return false;
      return true;
    });
  }, [entries, levelViewFilter]);

  const isPending = pending === "collect_event_logs";
  const justSucceeded = feedback?.phase === "success" && feedback.type === "collect_event_logs";
  const justFailed = feedback?.phase === "error" && feedback.type === "collect_event_logs";

  const handleCollect = () => {
    const filter: EventLogFilter = { logName, level, hoursBack, maxResults };
    onTrigger("collect_event_logs", "Collect Event Logs", JSON.stringify(filter));
  };

  const renderFeedback = () => {
    if (!feedback || feedback.type !== "collect_event_logs") return null;
    const cls =
      feedback.phase === "error"
        ? "details-panel__toast details-panel__toast--error"
        : feedback.phase === "success"
        ? "details-panel__toast details-panel__toast--success"
        : "details-panel__toast";
    return <div className={cls}>{feedback.message}</div>;
  };

  const renderBody = () => {
    if (loading && entries.length === 0) {
      return <div className="details-panel__hint">Loading event logs…</div>;
    }
    if (error) {
      return (
        <div className="details-panel__hint details-panel__hint--error">
          <span>{error}</span>
          <button className="btn btn--ghost" onClick={load}>Retry</button>
        </div>
      );
    }
    if (entries.length === 0) {
      return (
        <div className="details-panel__empty">
          <div className="details-panel__empty-title">No event logs collected</div>
          <div className="details-panel__empty-msg">
            Configure filters below and click "Collect Event Logs" to fetch Windows event log entries from this kiosk.
          </div>
        </div>
      );
    }
    if (visible.length === 0) {
      return <div className="details-panel__hint">No entries match the current filter.</div>;
    }

    return (
      <div className="cmd-table-wrap">
        <table className="cmd-table evlog-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Log</th>
              <th>Source</th>
              <th>ID</th>
              <th>Level</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => {
              const variant = levelVariant(e.level);
              return (
                <tr key={e.id} className={`cmd-table__row${variant === "error" ? " cmd-table__row--failed" : ""}`}>
                  <td className="td-nowrap evlog-table__time">{formatTime(e.timestamp)}</td>
                  <td><span className="evlog-table__logname">{e.logName}</span></td>
                  <td className="evlog-table__source">{e.source}</td>
                  <td className="evlog-table__eid">{e.eventId}</td>
                  <td>
                    <span className={`check-badge check-badge--${variant} log-level log-level--${variant}`}>
                      <span className="check-badge__dot" />
                      {e.level}
                    </span>
                  </td>
                  <td className="evlog-table__msg">{e.message}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="kiosk-tab-pane">
      <div className="evlog-collect-bar">
        <div className="evlog-collect-bar__filters">
          <select
            className="select"
            value={logName}
            onChange={(e) => setLogName(e.target.value)}
            aria-label="Log name"
          >
            <option value="all">All logs</option>
            <option value="Application">Application</option>
            <option value="System">System</option>
          </select>
          <select
            className="select"
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            aria-label="Level filter"
          >
            <option value="all">All levels</option>
            <option value="Error">Error</option>
            <option value="Warning">Warning</option>
            <option value="Information">Information</option>
          </select>
          <select
            className="select"
            value={hoursBack}
            onChange={(e) => setHoursBack(Number(e.target.value))}
            aria-label="Time range"
          >
            <option value={1}>Last 1h</option>
            <option value={6}>Last 6h</option>
            <option value={24}>Last 24h</option>
            <option value={48}>Last 48h</option>
            <option value={72}>Last 72h</option>
          </select>
          <select
            className="select"
            value={maxResults}
            onChange={(e) => setMaxResults(Number(e.target.value))}
            aria-label="Max results"
          >
            <option value={25}>25 entries</option>
            <option value={50}>50 entries</option>
            <option value={100}>100 entries</option>
          </select>
        </div>
        <button
          className={`btn${isPending ? " is-loading" : ""}${justSucceeded ? " is-success" : ""}${justFailed ? " is-error" : ""}`}
          onClick={handleCollect}
          disabled={pending !== null || !can.operate}
          title={!can.operate ? "You do not have permission to perform this action" : undefined}
          aria-busy={isPending}
        >
          {isPending ? "Sending…" : justSucceeded ? "Queued ✓" : justFailed ? "Failed" : "Collect Event Logs"}
        </button>
      </div>

      {renderFeedback()}

      {entries.length > 0 && (
        <div className="evlog-view-bar">
          <select
            className="select"
            value={levelViewFilter}
            onChange={(e) => setLevelViewFilter(e.target.value)}
            aria-label="View filter"
          >
            <option value="all">All levels</option>
            <option value="error">Error only</option>
            <option value="warning">Warning only</option>
            <option value="information">Information only</option>
          </select>
          <span className="evlog-view-bar__count">
            {visible.length} of {entries.length}
          </span>
        </div>
      )}

      {renderBody()}
    </div>
  );
};

export default KioskEventLogsTab;
