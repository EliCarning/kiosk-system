import React, { useState } from "react";
import { createCommand } from "../../api/actions";
import type { DashboardContext } from "../types";
import type { CommandType } from "../../types/command";

const COMMANDS: { type: CommandType; label: string; danger?: boolean }[] = [
  { type: "refresh_cache",      label: "Refresh Cache" },
  { type: "restart_browser",    label: "Restart Browser" },
  { type: "restart_service",    label: "Restart Service" },
  { type: "collect_system_info", label: "System Info" },
  { type: "collect_event_logs", label: "Event Logs" },
  { type: "restart_agent",      label: "Restart Agent", danger: true },
  { type: "reboot",             label: "Reboot",        danger: true },
];

interface Props {
  ctx: DashboardContext;
}

const QuickActionsWidget: React.FC<Props> = ({ ctx }) => {
  const allMachines =
    ctx.org?.sites.flatMap((s) => s.departments.flatMap((d) => d.kiosks)) ?? [];

  const [machine, setMachine] = useState("");
  const [running, setRunning] = useState<CommandType | null>(null);
  const [lastResult, setLastResult] = useState<{
    ok: boolean;
    label: string;
  } | null>(null);

  const fire = async (cmd: CommandType, label: string) => {
    if (!machine || running) return;
    if (cmd === "reboot" || cmd === "restart_agent") {
      if (!window.confirm(`${label} on ${machine}? This cannot be undone.`))
        return;
    }
    setRunning(cmd);
    setLastResult(null);
    try {
      await createCommand(machine, cmd, "");
      setLastResult({ ok: true, label });
    } catch {
      setLastResult({ ok: false, label });
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="chart-card quick-actions-widget">
      <div className="chart-card__head">
        <span className="chart-card__title">Quick Actions</span>
        {machine && (
          <span className="chart-card__sub">{machine}</span>
        )}
      </div>
      <div className="quick-actions__body">
        <select
          className="select"
          value={machine}
          onChange={(e) => {
            setMachine(e.target.value);
            setLastResult(null);
          }}
        >
          <option value="">— Select machine —</option>
          {allMachines.map((k) => (
            <option key={k.machineName} value={k.machineName}>
              {k.machineName}
            </option>
          ))}
        </select>

        {lastResult && (
          <div
            className={`quick-actions__result${
              lastResult.ok
                ? " quick-actions__result--ok"
                : " quick-actions__result--err"
            }`}
          >
            {lastResult.ok
              ? `✓ ${lastResult.label} queued`
              : `✕ ${lastResult.label} failed`}
          </div>
        )}

        <div className="quick-actions__grid">
          {COMMANDS.map((c) => (
            <button
              key={c.type}
              className={`btn${c.danger ? " btn--danger" : ""}${
                running === c.type ? " is-loading" : ""
              }`}
              disabled={!machine || running !== null}
              onClick={() => fire(c.type, c.label)}
            >
              {running === c.type ? "Running…" : c.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuickActionsWidget;
