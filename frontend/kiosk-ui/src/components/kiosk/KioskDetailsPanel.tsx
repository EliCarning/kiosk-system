import React, { useCallback, useEffect, useState } from "react";
import { Kiosk } from "../../types/org";
import { fetchCommands } from "../../api/commands";
import { fetchMachineLogs } from "../../api/logs";
import { CommandType, KioskCommand } from "../../types/command";
import { MachineLog } from "../../types/log";
import { RealtimeEvents, subscribeRealtime } from "../../realtime/events";
import { useKioskDetails } from "../../hooks/useKioskDetails";
import { useKioskActions } from "../../hooks/useKioskActions";
import Tabs, { TabDef } from "../Tabs";
import KioskOverviewTab from "./KioskOverviewTab";
import KioskCommandsTab from "./KioskCommandsTab";
import KioskLogsTab from "./KioskLogsTab";

interface KioskDetailsPanelProps {
  kiosk: Kiosk;
  onClose: () => void;
}

type TabId = "overview" | "commands" | "logs";

const COMMANDS_POLL_MS = 5000;
const LOGS_POLL_MS = 5000;
const TAB_STORAGE_PREFIX = "kiosk.details.tab:";

const loadLastTab = (machineName: string): TabId => {
  try {
    const raw = window.localStorage.getItem(TAB_STORAGE_PREFIX + machineName);
    if (raw === "overview" || raw === "commands" || raw === "logs") return raw;
  } catch {
    // ignore storage errors
  }
  return "overview";
};

const saveLastTab = (machineName: string, tab: TabId) => {
  try {
    window.localStorage.setItem(TAB_STORAGE_PREFIX + machineName, tab);
  } catch {
    // ignore storage errors
  }
};

const KioskDetailsPanel: React.FC<KioskDetailsPanelProps> = ({
  kiosk,
  onClose,
}) => {
  const { overview, alerts, loading: overviewLoading } = useKioskDetails(
    kiosk.machineName
  );

  const [activeTab, setActiveTab] = useState<TabId>(() =>
    loadLastTab(kiosk.machineName)
  );

  const [commands, setCommands] = useState<KioskCommand[]>([]);
  const [commandsLoading, setCommandsLoading] = useState<boolean>(true);
  const [commandsError, setCommandsError] = useState<string | null>(null);

  const [logs, setLogs] = useState<MachineLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  useEffect(() => {
    setActiveTab(loadLastTab(kiosk.machineName));
  }, [kiosk.machineName]);

  const handleTabChange = useCallback(
    (id: TabId) => {
      setActiveTab(id);
      saveLastTab(kiosk.machineName, id);
    },
    [kiosk.machineName]
  );

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

  const { pending, feedback, trigger } = useKioskActions(
    kiosk.machineName,
    loadCommands
  );

  const handleAction = async (type: CommandType, label: string) => {
    if (type === "reboot") {
      const ok = window.confirm(
        `Reboot ${kiosk.machineName}? This will restart the machine.`
      );
      if (!ok) return;
    }
    await trigger(type, label);
  };

  const activeAlertCount = overview?.activeAlertsCount ?? alerts.length;
  const failedCount = commands.filter(
    (c) => c.status.toLowerCase() === "failed"
  ).length;

  const tabs: TabDef<TabId>[] = [
    {
      id: "overview",
      label: "Overview",
      badge: activeAlertCount > 0 ? activeAlertCount : undefined,
    },
    {
      id: "commands",
      label: "Commands",
      badge: failedCount > 0 ? failedCount : undefined,
    },
    { id: "logs", label: "Logs" },
  ];

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

      <Tabs<TabId>
        tabs={tabs}
        active={activeTab}
        onChange={handleTabChange}
        ariaLabel="Kiosk details sections"
      />

      <div className="kiosk-tab-content">
        {activeTab === "overview" && (
          <KioskOverviewTab
            machineName={kiosk.machineName}
            displayName={kiosk.displayName}
            fallbackStatus={kiosk.status}
            fallbackIp={kiosk.ipAddress}
            fallbackLastSeen={kiosk.lastSeen}
            overview={overview}
            overviewLoading={overviewLoading}
            alerts={alerts}
            pending={pending}
            feedback={feedback}
            onTrigger={handleAction}
          />
        )}
        {activeTab === "commands" && (
          <KioskCommandsTab
            commands={commands}
            loading={commandsLoading}
            error={commandsError}
            onRetry={loadCommands}
          />
        )}
        {activeTab === "logs" && (
          <KioskLogsTab
            logs={logs}
            loading={logsLoading}
            error={logsError}
            onRetry={loadLogs}
          />
        )}
      </div>
    </aside>
  );
};

export default KioskDetailsPanel;
