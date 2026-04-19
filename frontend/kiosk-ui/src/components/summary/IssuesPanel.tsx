import React from "react";
import { IssuesResponse } from "../../api/dashboard";

const formatRelative = (iso: string): string => {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

interface Props {
  title?: string;
  issues: IssuesResponse | null;
  loading?: boolean;
  onSelectMachine?: (machineName: string) => void;
  emptyMessage?: string;
}

const IssuesPanel: React.FC<Props> = ({
  title = "Recent issues",
  issues,
  loading,
  onSelectMachine,
  emptyMessage = "No issues in this scope right now.",
}) => {
  const totalIssues =
    (issues?.recentAlerts.length ?? 0) +
    (issues?.failedCommands.length ?? 0) +
    (issues?.problematicKiosks.length ?? 0);

  return (
    <section className="issues-panel">
      <header className="issues-panel__head">
        <h3 className="issues-panel__title">{title}</h3>
        <span className="issues-panel__count">
          {loading && !issues ? "—" : totalIssues}
        </span>
      </header>

      {!issues && loading ? (
        <div className="issues-panel__empty">Loading issues...</div>
      ) : totalIssues === 0 ? (
        <div className="issues-panel__empty">{emptyMessage}</div>
      ) : (
        <div className="issues-panel__grid">
          <div className="issues-panel__col">
            <div className="issues-panel__subtitle">
              Active alerts
              <span className="issues-panel__badge">
                {issues?.recentAlerts.length ?? 0}
              </span>
            </div>
            {issues && issues.recentAlerts.length > 0 ? (
              <ul className="issues-list">
                {issues.recentAlerts.map((a) => (
                  <li
                    key={a.id}
                    className="issues-list__item issues-list__item--alert"
                    onClick={() => onSelectMachine?.(a.machineName)}
                  >
                    <div className="issues-list__row">
                      <span className="issues-list__machine">
                        {a.machineName}
                      </span>
                      <span className="issues-list__time">
                        {formatRelative(a.createdAt)}
                      </span>
                    </div>
                    <div className="issues-list__meta">
                      <span className="issues-list__tag">{a.type}</span>
                      <span className="issues-list__msg">{a.message}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="issues-panel__empty-sm">No active alerts.</div>
            )}
          </div>

          <div className="issues-panel__col">
            <div className="issues-panel__subtitle">
              Failed commands · 24h
              <span className="issues-panel__badge">
                {issues?.failedCommands.length ?? 0}
              </span>
            </div>
            {issues && issues.failedCommands.length > 0 ? (
              <ul className="issues-list">
                {issues.failedCommands.map((c) => (
                  <li
                    key={c.id}
                    className="issues-list__item issues-list__item--cmd"
                    onClick={() => onSelectMachine?.(c.machineName)}
                  >
                    <div className="issues-list__row">
                      <span className="issues-list__machine">
                        {c.machineName}
                      </span>
                      <span className="issues-list__time">
                        {formatRelative(c.createdAt)}
                      </span>
                    </div>
                    <div className="issues-list__meta">
                      <span className="issues-list__tag">{c.type}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="issues-panel__empty-sm">
                No failed commands in 24h.
              </div>
            )}
          </div>

          <div className="issues-panel__col">
            <div className="issues-panel__subtitle">
              Problematic kiosks
              <span className="issues-panel__badge">
                {issues?.problematicKiosks.length ?? 0}
              </span>
            </div>
            {issues && issues.problematicKiosks.length > 0 ? (
              <ul className="issues-list">
                {issues.problematicKiosks.map((k) => (
                  <li
                    key={k.machineName}
                    className="issues-list__item issues-list__item--kiosk"
                    onClick={() => onSelectMachine?.(k.machineName)}
                  >
                    <div className="issues-list__row">
                      <span className="issues-list__machine">
                        {k.machineName}
                      </span>
                      <span className="issues-list__time">
                        {formatRelative(k.lastSeen)}
                      </span>
                    </div>
                    <div className="issues-list__meta">
                      <span
                        className={`issues-list__tag issues-list__tag--${k.status.toLowerCase()}`}
                      >
                        {k.status}
                      </span>
                      <span className="issues-list__msg">{k.reason}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="issues-panel__empty-sm">
                All kiosks healthy.
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default IssuesPanel;
