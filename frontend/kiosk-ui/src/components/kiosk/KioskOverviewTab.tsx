import React from "react";
import StatusBadge from "../StatusBadge";
import { CommandType } from "../../types/command";
import { KioskOverview } from "../../api/kioskDetails";
import { ActionFeedback } from "../../hooks/useKioskActions";
import { useCan } from "../../context/PermissionsContext";

interface ActionDef {
  type: CommandType;
  label: string;
  danger?: boolean;
}

const ACTIONS: ActionDef[] = [
  { type: "refresh_cache", label: "Refresh Cache" },
  { type: "restart_service", label: "Restart Service" },
  { type: "restart_browser", label: "Restart Browser" },
  { type: "collect_system_info", label: "Collect System Info" },
  { type: "collect_event_logs", label: "Collect Event Logs" },
  { type: "restart_agent", label: "Restart Agent" },
  { type: "reboot", label: "Reboot", danger: true },
];

interface KioskOverviewTabProps {
  machineName: string;
  displayName: string;
  fallbackStatus: string;
  fallbackIp: string;
  fallbackLastSeen: string | null;
  overview: KioskOverview | null;
  overviewLoading: boolean;
  pending: CommandType | null;
  feedback: ActionFeedback | null;
  onTrigger: (type: CommandType, label: string) => void;
}

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const formatRelative = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
};

const KioskOverviewTab: React.FC<KioskOverviewTabProps> = ({
  machineName,
  displayName,
  fallbackStatus,
  fallbackIp,
  fallbackLastSeen,
  overview,
  overviewLoading,
  pending,
  feedback,
  onTrigger,
}) => {
  const can = useCan();

  const displayStatus = overview?.status ?? fallbackStatus;
  const displayIp = overview?.ipAddress || fallbackIp;
  const displayLastSeen = overview?.lastSeen ?? fallbackLastSeen;
  const siteLabel = overview?.siteName ?? "—";
  const departmentLabel = overview?.departmentName ?? "—";
  const activeAlerts = overview?.activeAlertsCount ?? 0;
  const failedCommands24h = overview?.failedCommandsLast24h ?? 0;
  const logsCount24h = overview?.logsCountLast24h ?? 0;

  const renderFeedback = () => {
    if (!feedback) return null;
    const cls =
      feedback.phase === "error"
        ? "details-panel__toast details-panel__toast--error"
        : feedback.phase === "success"
        ? "details-panel__toast details-panel__toast--success"
        : "details-panel__toast";
    return <div className={cls}>{feedback.message}</div>;
  };

  return (
    <div className="kiosk-tab-pane">
      <section className="details-panel__section">
        <div className="details-panel__meta">
          <div>
            <div className="details-panel__label">Machine</div>
            <div className="details-panel__value">{displayName}</div>
            <div className="details-panel__sublabel">
              <code>{machineName}</code>
            </div>
          </div>
          <div>
            <div className="details-panel__label">Status</div>
            <StatusBadge status={displayStatus} />
          </div>
          <div>
            <div className="details-panel__label">IP Address</div>
            <div className="details-panel__value details-panel__value--mono">
              {displayIp || "—"}
            </div>
          </div>
          <div>
            <div className="details-panel__label">Last Seen</div>
            <div className="details-panel__value">
              {formatDate(displayLastSeen)}
            </div>
            <div className="details-panel__sublabel">
              {formatRelative(displayLastSeen)}
            </div>
          </div>
        </div>

        <div className="details-panel__kv details-panel__kv--compact">
          <div>
            <div className="details-panel__label">Site</div>
            <div className="details-panel__value">{siteLabel}</div>
          </div>
          <div>
            <div className="details-panel__label">Department</div>
            <div className="details-panel__value">{departmentLabel}</div>
          </div>
        </div>

        <div className="kiosk-counters">
          <div
            className={`kiosk-counter${
              activeAlerts > 0 ? " kiosk-counter--alert" : ""
            }`}
          >
            <div className="kiosk-counter__value">
              {overviewLoading && !overview ? "—" : activeAlerts}
            </div>
            <div className="kiosk-counter__label">Active alerts</div>
          </div>
          <div
            className={`kiosk-counter${
              failedCommands24h > 0 ? " kiosk-counter--warn" : ""
            }`}
          >
            <div className="kiosk-counter__value">
              {overviewLoading && !overview ? "—" : failedCommands24h}
            </div>
            <div className="kiosk-counter__label">Failed cmds · 24h</div>
          </div>
          <div className="kiosk-counter">
            <div className="kiosk-counter__value">
              {overviewLoading && !overview ? "—" : logsCount24h}
            </div>
            <div className="kiosk-counter__label">Log entries · 24h</div>
          </div>
        </div>
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">Quick actions</div>
        <div className="details-panel__actions">
          {ACTIONS.map((a) => {
            const isPendingThis = pending === a.type;
            const isReboot = a.type === "reboot";
            if (isReboot && !can.reboot) return null;
            const permitted = can.operate && (!isReboot || can.reboot);
            const anyPending = pending !== null;
            const disabled = anyPending || !permitted;
            const title = !permitted
              ? "You do not have permission to perform this action"
              : undefined;
            const justSucceeded =
              feedback?.phase === "success" && feedback.type === a.type;
            const justFailed =
              feedback?.phase === "error" && feedback.type === a.type;
            return (
              <button
                key={a.type}
                className={`btn${a.danger ? " btn--danger" : ""}${
                  !permitted ? " btn--disabled" : ""
                }${isPendingThis ? " is-loading" : ""}${
                  justSucceeded ? " is-success" : ""
                }${justFailed ? " is-error" : ""}`}
                onClick={() => onTrigger(a.type, a.label)}
                disabled={disabled}
                title={title}
                aria-disabled={disabled}
                aria-busy={isPendingThis}
              >
                {isPendingThis
                  ? "Sending…"
                  : justSucceeded
                  ? "Queued ✓"
                  : justFailed
                  ? "Failed"
                  : a.label}
              </button>
            );
          })}
        </div>
        {!can.operate && (
          <div className="details-panel__toast">
            Read-only access — actions are disabled for your role.
          </div>
        )}
        {renderFeedback()}
      </section>

    </div>
  );
};

export default KioskOverviewTab;
