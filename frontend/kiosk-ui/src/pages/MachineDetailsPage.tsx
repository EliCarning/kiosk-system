import React, { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchMachines } from "../api/machines";
import { fetchMachineLogs } from "../api/logs";
import { Machine } from "../types/machine";
import { MachineLog } from "../types/log";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import StateView from "../components/StateView";
import LogsPanel from "../components/LogsPanel";

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MachineDetailsPage: React.FC = () => {
  const { machineName = "" } = useParams<{ machineName: string }>();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [machineLoading, setMachineLoading] = useState<boolean>(true);
  const [machineError, setMachineError] = useState<string | null>(null);

  const [logs, setLogs] = useState<MachineLog[]>([]);
  const [logsLoading, setLogsLoading] = useState<boolean>(true);
  const [logsError, setLogsError] = useState<string | null>(null);

  const loadMachine = useCallback(async () => {
    setMachineLoading(true);
    setMachineError(null);
    try {
      const all = await fetchMachines();
      const found = all.find((m) => m.machineName === machineName) ?? null;
      setMachine(found);
    } catch (err) {
      setMachineError(
        err instanceof Error ? err.message : "Unable to load machine"
      );
    } finally {
      setMachineLoading(false);
    }
  }, [machineName]);

  const loadLogs = useCallback(async () => {
    if (!machineName) return;
    setLogsLoading(true);
    setLogsError(null);
    try {
      const data = await fetchMachineLogs(machineName);
      setLogs(data);
    } catch (err) {
      setLogsError(err instanceof Error ? err.message : "Unable to load logs");
    } finally {
      setLogsLoading(false);
    }
  }, [machineName]);

  useEffect(() => {
    loadMachine();
    loadLogs();
    const intervalId = window.setInterval(() => {
      loadMachine();
      loadLogs();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, [loadMachine, loadLogs]);

  const renderMachineCard = () => {
    if (machineLoading && !machine) {
      return (
        <StateView
          variant="loading"
          title="Loading machine"
          message="Fetching machine details..."
        />
      );
    }
    if (machineError) {
      return (
        <StateView
          variant="error"
          title="Unable to load machine"
          message={machineError}
          onRetry={loadMachine}
        />
      );
    }
    if (!machine) {
      return (
        <StateView
          variant="empty"
          title="Machine not found"
          message={`No machine named "${machineName}" is currently reporting.`}
        />
      );
    }

    return (
      <div className="details-card">
        <div className="details-grid">
          <div className="details-grid__item">
            <div className="details-grid__label">Machine Name</div>
            <div className="details-grid__value">{machine.machineName}</div>
          </div>
          <div className="details-grid__item">
            <div className="details-grid__label">IP Address</div>
            <div className="details-grid__value details-grid__value--mono">
              {machine.ipAddress}
            </div>
          </div>
          <div className="details-grid__item">
            <div className="details-grid__label">Status</div>
            <div className="details-grid__value">
              <StatusBadge status={machine.status} />
            </div>
          </div>
          <div className="details-grid__item">
            <div className="details-grid__label">Last Seen</div>
            <div className="details-grid__value details-grid__value--muted">
              {formatDate(machine.lastSeen)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <PageHeader
        title={machineName || "Machine"}
        subtitle="Machine details and recent logs"
        actions={
          <>
            <Link to="/" className="btn">
              ← Back
            </Link>
            <button
              className="btn btn--primary"
              onClick={() => {
                loadMachine();
                loadLogs();
              }}
              disabled={machineLoading || logsLoading}
            >
              {machineLoading || logsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </>
        }
      />

      <section>{renderMachineCard()}</section>

      <section>
        <LogsPanel
          logs={logs}
          loading={logsLoading && logs.length === 0}
          error={logsError}
          onRetry={loadLogs}
        />
      </section>
    </div>
  );
};

export default MachineDetailsPage;
