import React from "react";
import { MachineLog } from "../types/log";
import StateView from "./StateView";

interface LogsPanelProps {
  logs: MachineLog[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

const formatTimestamp = (iso: string): string => {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
};

const levelToVariant = (level: string): string => {
  const normalized = level.toLowerCase();
  if (normalized === "error") return "error";
  if (normalized === "warning" || normalized === "warn") return "warning";
  if (normalized === "info") return "info";
  return "neutral";
};

const LogsPanel: React.FC<LogsPanelProps> = ({
  logs,
  loading,
  error,
  onRetry,
}) => {
  const renderBody = () => {
    if (loading) {
      return (
        <StateView
          variant="loading"
          title="Loading logs"
          message="Fetching recent log entries..."
        />
      );
    }
    if (error) {
      return (
        <StateView
          variant="error"
          title="Unable to load logs"
          message={error}
          onRetry={onRetry}
        />
      );
    }
    if (logs.length === 0) {
      return (
        <StateView
          variant="empty"
          title="No logs yet"
          message="This machine has not reported any log entries."
        />
      );
    }
    return (
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: "220px" }}>Timestamp</th>
              <th style={{ width: "110px" }}>Level</th>
              <th>Message</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, idx) => (
              <tr key={`${log.timestamp}-${idx}`}>
                <td className="data-table__mono">
                  {formatTimestamp(log.timestamp)}
                </td>
                <td>
                  <span
                    className={`log-level log-level--${levelToVariant(
                      log.level
                    )}`}
                  >
                    {log.level}
                  </span>
                </td>
                <td className="data-table__primary">{log.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="table-card">
      <div className="table-card__header">
        <h2 className="table-card__title">Logs</h2>
        {!loading && !error && (
          <span className="table-card__count">{logs.length} entries</span>
        )}
      </div>
      {renderBody()}
    </div>
  );
};

export default LogsPanel;
