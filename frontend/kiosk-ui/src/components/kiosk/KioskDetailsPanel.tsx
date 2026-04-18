import React, { useCallback, useEffect, useState } from "react";
import { Kiosk } from "../../types/org";
import StatusBadge from "../StatusBadge";
import CheckBadge from "./CheckBadge";
import CommandHistory from "./CommandHistory";
import { createCommand } from "../../api/actions";
import { fetchCommands } from "../../api/commands";
import { fetchMachineLogs } from "../../api/logs";
import { CommandType, KioskCommand } from "../../types/command";
import { MachineLog } from "../../types/log";
import { useCan } from "../../context/PermissionsContext";

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

const formatDate = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
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

const KioskDetailsPanel: React.FC<KioskDetailsPanelProps> = ({ kiosk, onClose }) => {
  const can = useCan();
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });

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
    return () => window.clearInterval(id);
  }, [loadCommands]);

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

  const renderLogs = () => {
    if (logsLoading && logs.length === 0) {
      return <div className="cmd-history__hint">Loading logs...</div>;
    }
    if (logsError) {
      return (
        <div className="cmd-history__hint cmd-history__hint--error">
          <span>{logsError}</span>
          <button className="btn btn--ghost" onClick={loadLogs}>
            Retry
          </button>
        </div>
      );
    }
    if (logs.length === 0) {
      return <div className="cmd-history__hint">No logs for this machine.</div>;
    }
    const preview = logs.slice(0, LOGS_PREVIEW_COUNT);
    return (
      <ul className="cmd-history">
        {preview.map((log, idx) => (
          <li
            key={`${log.timestamp}-${idx}`}
            className="cmd-history__row"
          >
            <div className="cmd-history__main">
              <span
                className={`log-level log-level--${levelToVariant(log.level)}`}
              >
                {log.level}
              </span>
              <span className="cmd-history__type">{log.message}</span>
            </div>
            <div className="cmd-history__meta">
              <span>{formatLogTime(log.timestamp)}</span>
            </div>
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

      <section className="details-panel__section">
        <div className="details-panel__meta">
          <div>
            <div className="details-panel__label">Status</div>
            <StatusBadge status={kiosk.status} />
          </div>
          <div>
            <div className="details-panel__label">IP Address</div>
            <div className="details-panel__value details-panel__value--mono">
              {kiosk.ipAddress}
            </div>
          </div>
          <div>
            <div className="details-panel__label">Last Seen</div>
            <div className="details-panel__value">{formatDate(kiosk.lastSeen)}</div>
          </div>
        </div>
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">Checks</div>
        <div className="details-panel__checks">
          {kiosk.checks.map((c) => (
            <CheckBadge key={c.kind} check={c} />
          ))}
        </div>
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">GPO</div>
        <div className="details-panel__kv">
          <div>
            <div className="details-panel__label">Last applied</div>
            <div className="details-panel__value">{formatDate(kiosk.gpo.lastApplied)}</div>
          </div>
          <div>
            <div className="details-panel__label">Version</div>
            <div className="details-panel__value details-panel__value--mono">
              {kiosk.gpo.version}
            </div>
          </div>
        </div>
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">Browser / App</div>
        <div className="details-panel__kv">
          <div>
            <div className="details-panel__label">Name</div>
            <div className="details-panel__value">{kiosk.browser.name}</div>
          </div>
          <div>
            <div className="details-panel__label">Version</div>
            <div className="details-panel__value details-panel__value--mono">
              {kiosk.browser.version}
            </div>
          </div>
          <div>
            <div className="details-panel__label">Running</div>
            <div className="details-panel__value">
              {kiosk.browser.running ? "Yes" : "No"}
            </div>
          </div>
        </div>
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">Network</div>
        <div className="details-panel__kv">
          <div>
            <div className="details-panel__label">Gateway</div>
            <div className="details-panel__value details-panel__value--mono">
              {kiosk.network.gateway}
            </div>
          </div>
          <div>
            <div className="details-panel__label">DNS</div>
            <div className="details-panel__value details-panel__value--mono">
              {kiosk.network.dns}
            </div>
          </div>
          <div>
            <div className="details-panel__label">Latency</div>
            <div className="details-panel__value">
              {kiosk.network.latencyMs != null
                ? `${kiosk.network.latencyMs} ms`
                : "—"}
            </div>
          </div>
        </div>
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">Actions</div>
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

      <section className="details-panel__section">
        <div className="details-panel__section-title">Command history</div>
        <CommandHistory
          commands={commands}
          loading={commandsLoading}
          error={commandsError}
          onRetry={loadCommands}
        />
      </section>

      <section className="details-panel__section">
        <div className="details-panel__section-title">Logs</div>
        {renderLogs()}
      </section>
    </aside>
  );
};

export default KioskDetailsPanel;
