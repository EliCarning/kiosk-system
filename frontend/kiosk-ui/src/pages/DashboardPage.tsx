import React, { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMachines } from "../api/machines";
import { Machine } from "../types/machine";
import PageHeader from "../components/PageHeader";
import SummaryCard from "../components/SummaryCard";
import MachinesTable from "../components/MachinesTable";
import StateView from "../components/StateView";

const DashboardPage: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMachines();
      setMachines(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load machines";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const stats = useMemo(() => {
    const total = machines.length;
    const online = machines.filter(
      (m) => m.status.toLowerCase() === "online"
    ).length;
    const offline = machines.filter(
      (m) => m.status.toLowerCase() === "offline"
    ).length;
    const warning = machines.filter((m) => {
      const s = m.status.toLowerCase();
      return s === "warning" || s === "degraded";
    }).length;
    return { total, online, offline, warning };
  }, [machines]);

  const renderContent = () => {
    if (loading) {
      return (
        <StateView
          variant="loading"
          title="Loading machines"
          message="Fetching the latest kiosk status..."
        />
      );
    }
    if (error) {
      return (
        <StateView
          variant="error"
          title="Something went wrong"
          message={error}
          onRetry={loadMachines}
        />
      );
    }
    if (machines.length === 0) {
      return (
        <StateView
          variant="empty"
          title="No machines yet"
          message="Once kiosks come online they'll appear here."
        />
      );
    }
    return <MachinesTable machines={machines} />;
  };

  return (
    <div className="dashboard">
      <PageHeader
        title="Kiosk Dashboard"
        subtitle="Monitor the health and status of your deployed machines"
        actions={
          <button
            className="btn btn--primary"
            onClick={loadMachines}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        }
      />

      <section className="summary-grid">
        <SummaryCard label="Total Machines" value={stats.total} />
        <SummaryCard
          label="Online"
          value={stats.online}
          accent="online"
          hint="Active and reporting"
        />
        <SummaryCard
          label="Offline"
          value={stats.offline}
          accent="offline"
          hint="Not reachable"
        />
        <SummaryCard
          label="Warnings"
          value={stats.warning}
          accent="warning"
          hint="Needs attention"
        />
      </section>

      <section className="dashboard__content">{renderContent()}</section>
    </div>
  );
};

export default DashboardPage;
