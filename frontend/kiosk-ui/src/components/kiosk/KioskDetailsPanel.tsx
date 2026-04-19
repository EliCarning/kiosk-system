import React, { useCallback, useEffect, useState } from "react";
import { Kiosk } from "../../types/org";
import StatusBadge from "../StatusBadge";
import CommandHistory from "./CommandHistory";
import { createCommand } from "../../api/actions";
import { fetchCommands } from "../../api/commands";
import { fetchMachineLogs } from "../../api/logs";
import { CommandType, KioskCommand } from "../../types/command";
import { MachineLog } from "../../types/log";
import { useCan } from "../../context/PermissionsContext";
import { RealtimeEvents, subscribeRealtime } from "../../realtime/events";
import { useKioskDetails } from "../../hooks/useKioskDetails";

interface KioskDetailsPanelProps {
  kiosk: Kiosk;
  onClose: () => void;
}

interface ActionDef {
  type: CommandType;
  label: string;
  danger?: boolean;
}

const ACTIONS: ActionDef[] = [
  { type: "refresh_cache", label: "Refresh Cache" },
  { type: "restart_service", label: "Restart Service" },
  { type: "restart_browser", label: "Restart Browser" },
  { type: "gpupdate", label: "gpupdate" },
  { type: "reboot", label: "Reboot", danger: true },
];

type ActionState =
  | { kind: "idle" }
  | { kind: "sending"; type: CommandType }
  | { kind: "success"; type: CommandType; message: string }
  | { kind: "error"; type: CommandType; message: string };

const COMMANDS_POLL_MS = 5000;
const LOGS_POLL_MS = 5000;
const LOGS_PREVIEW_COUNT = 15;
const ALERTS_PREVIEW_COUNT = 10;

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

const KioskDetailsPanel: React.FC<KioskDetailsPanelProps> = ({
  kiosk,
  onClose,
}) => {
  const can = useCan();
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });

  const { overview, alerts, loading: overviewLoading } = useKioskDetails(
    kiosk.machineName
  );

  const [commands, setCommands] = useState<KioskCommand[]>([]);
  const [commandsLoading, setCommandsLoading] = useState<boolean>(true);
  const [commandsError, setCommandsError] = useState<string | null>(null);

  const [logs, setLogs] = useState<MachineLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const loadCommands = useCallback(async () => {
    setCommandsError(null);
    try {
      const data = await fetchCommands(kiosk.machineName);
      setCommands(data);
    } catch (err) {
      setCommandsError(
        err instanceof Error ? err.message : "Unable to load commands"
      );
    } finally {
      setCommandsLoading(false);
    }
  }, [kiosk.machineName]);

  const loadLogs = useCallback(async () => {
    setLogsError(null);
    try {
      const data = await fetchMachineLogs(kiosk.machineName);
      setLogs(data);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : "Unable to load logs");
    } finally {
      setLogsLoading(false);
    }
  }, [kiosk.machineName]);

  useEffect(() => {
    setCommandsLoading(true);
    setCommands([]);
    loadCommands();
    const id = window.setInterval(loadCommands, COMMANDS_POLL_MS);
    const unsubscribe = subscribeRealtime<{ machineName?: string }>(
      RealtimeEvents.CommandUpdated,
      (payload) => {
        if (!payload || payload.machineName === kiosk.machineName) {
          loadCommands();
        }
      }
    );
    return () => {
      window.clearInterval(id);
      unsubscribe();
    };
  }, [loadCommands, kiosk.machineName]);

  useEffect(() => {
    setLogsLoading(true);
    setLogs([]);
    loadLogs();
    const id = window.setInterval(loadLogs, LOGS_POLL_MS);
    return () => window.clearInterval(id);
  }, [loadLogs]);

  const handleAction = async (type: CommandType, label: string) => {
    setActionState({ kind: "sending", type });
    try {
      await createCommand(kiosk.machineName, type, "");
      setActionState({
        kind: "success",
        type,
        message: `${label} queued on ${kiosk.machineName}`,
      });
      loadCommands();
    } catch (err) {
      setActionState({
        kind: "error",
        type,
        message: err instanceof Error ? err.message : "Action failed",
      });
    } finally {
      window.setTimeout(() => {
        setActionState((curr) =>
          curr.kind !== "idle" && curr.type === type ? { kind: "idle" } : curr
        );
      }, 4000);
    }
  };

  const renderFeedback = () => {
    if (actionState.kind === "idle") return null;
    const cls =
      actionState.kind === "error"
        ? "details-panel__toast details-panel__toast--error"
        : actionState.kind === "success"
        ? "details-panel__toast details-panel__toast--success"
        : "details-panel__toast";
    const text =
      actionState.kind === "sending"
        ? `Sending ${actionState.type}...`
        : actionState.message;
    return <div className={cls}>{text}</div>;
  };

  const displayStatus = overview?.status ?? kiosk.status;
  const displayIp = overview?.ipAddress || kiosk.ipAddress;
  const displayLastSeen = overview?.lastSeen ?? kiosk.lastSeen;
  const siteLabel = overview?.siteName ?? "—";
  const departmentLabel = overview?.departmentName ?? "—";
  const activeAlerts = overview?.activeAlertsCount ?? 0;
  const failedCommands24h = overview?.failedCommandsLast24h ?? 0;
  const logsCount24h = overview?.logsCountLast24h ?? 0;

  const renderOverview = () => (
    <section className="details-panel__section">
      <div className="details-panel__section-title">Overview</div>
      <div className="details-panel__meta">
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
  );

  const renderRecentAlerts = () => {
    if (overviewLoading && alerts.length === 0 && !overview) {
      return (
        <div className="details-panel__hint">Loading alerts...</div>
      );
    }
    if (alerts.length === 0) {
      return (
        <div className="details-panel__hint">
          No alerts recorded for this kiosk.
        </div>
      );
    }
    const preview = alerts.slice(0, ALERTS_PREVIEW_COUNT);
    return (
      <ul className="kiosk-alerts">
        {preview.map((a) => (
          <li key={a.id} className="kiosk-alerts__row">
            <div className="kiosk-alerts__head">
              <span className="kiosk-alerts__type">{a.type}</span>
              <span className="kiosk-alerts__time">
                {formatRelative(a.createdAt)}
              </span>
            </div>
            <div className="kiosk-alerts__msg">{a.message}</div>
          </li>
        ))}
      </ul>
    );
  };

  const renderLogs = () => {
    if (logsLoading && logs.length === 0) {
      return <div className="details-panel__hint">Loading logs...</div>;
    }
    if (logsError) {
      return (
        <div className="details-panel__hint details-panel__hint--error">
          <span>{logsError}</span>
          <button className="btn btn--ghost" onClick={loadLogs}>
            Retry
          </button>
        </div>
      );
    }
    if (logs.length === 0) {
      return (
        <div className="details-panel__hint">No logs for this machine.</div>
      );
    }
    const preview = logs.slice(0, LOGS_PREVIEW_COUNT);
    return (
      <ul className="kiosk-logs">
        {preview.map((log, idx) => (
          <li key={`${log.timestamp}-${idx}`} className="kiosk-logs__row">
            <div className="kiosk-logs__main">
              <span
                className={`log-level log-level--${levelToVariant(log.level)}`}
              >
                {log.level}
              </span>
              <span className="kiosk-logs__msg">{log.message}</span>
            </div>
            <div className="kiosk-logs__meta">{formatLogTime(log.timestamp)}</div>
          </li>
        ))}
      </ul>
    );
  };

  const isSending = actionState.kind === "sending";

  return (
    <aside className="details-panel">
      <header className="details-panel__head">
        <div>
          <div className="details-panel__title">{kiosk.displayName}</div>
          <div className="details-panel__sub">
            <code>{kiosk.machineName}</code>
          </div>
        </div>
        <button className="btn btn--ghost" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </header>

      {renderOverview()}

      <section className="details-panel__section">
        <div className="details-panel__section-title">
          Recent alerts
          <span className="details-panel__section-count">
            {overviewLoading && !overview ? "—" : alerts.length}
          </span>
        </div>
        {renderRecentAlerts()}
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">
          Recent logs
          <span className="details-panel__section-count">
            {logsLoading && logs.length === 0 ? "—" : logs.length}
          </span>
        </div>
        {renderLogs()}
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">
          Command history
          <span className="details-panel__section-count">
            {commandsLoading && commands.length === 0 ? "—" : commands.length}
          </span>
        </div>
        <CommandHistory
          commands={commands}
          loading={commandsLoading}
          error={commandsError}
          onRetry={loadCommands}
        />
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">Quick actions</div>
        <div className="details-panel__actions">
          {ACTIONS.map((a) => {
            const activeForThis =
              actionState.kind !== "idle" && actionState.type === a.type;
            const isReboot = a.type === "reboot";
            if (isReboot && !can.reboot) return null;
            const permitted = can.operate && (!isReboot || can.reboot);
            const disabled = isSending || !permitted;
            const title = !permitted
              ? "You do not have permission to perform this action"
              : undefined;
            return (
              <button
                key={a.type}
                className={`btn${a.danger ? " btn--danger" : ""}${
                  !permitted ? " btn--disabled" : ""
                }`}
                onClick={() => handleAction(a.type, a.label)}
                disabled={disabled}
                title={title}
                aria-disabled={disabled}
              >
                {activeForThis && actionState.kind === "sending"
                  ? "Sending..."
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
    </aside>
  );
};

export default KioskDetailsPanel;
