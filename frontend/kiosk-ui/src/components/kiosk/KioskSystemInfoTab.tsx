import React, { useCallback, useEffect, useState } from "react";
import { SystemInfo } from "../../types/systemInfo";
import { fetchSystemInfoLatest } from "../../api/systemInfo";
import { CommandType } from "../../types/command";
import { ActionFeedback } from "../../hooks/useKioskActions";
import { useCan } from "../../context/PermissionsContext";

interface KioskSystemInfoTabProps {
  machineName: string;
  pending: CommandType | null;
  feedback: ActionFeedback | null;
  onTrigger: (type: CommandType, label: string) => void;
}

const POLL_MS = 15000;

const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const formatBytes = (mb: number | null | undefined, unit: "MB" | "GB" = "GB"): string => {
  if (mb == null) return "—";
  if (unit === "GB") return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb.toLocaleString()} MB`;
};

interface KvRow {
  label: string;
  value: React.ReactNode;
}

const KvGrid: React.FC<{ rows: KvRow[] }> = ({ rows }) => (
  <div className="sysinfo-kv">
    {rows.map((r) => (
      <React.Fragment key={r.label}>
        <dt className="sysinfo-kv__label">{r.label}</dt>
        <dd className="sysinfo-kv__value">{r.value ?? "—"}</dd>
      </React.Fragment>
    ))}
  </div>
);

const KioskSystemInfoTab: React.FC<KioskSystemInfoTabProps> = ({
  machineName,
  pending,
  feedback,
  onTrigger,
}) => {
  const can = useCan();
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchSystemInfoLatest(machineName);
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load system info");
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

  const isPending = pending === "collect_system_info";
  const justSucceeded = feedback?.phase === "success" && feedback.type === "collect_system_info";
  const justFailed = feedback?.phase === "error" && feedback.type === "collect_system_info";

  const renderFeedback = () => {
    if (!feedback || feedback.type !== "collect_system_info") return null;
    const cls =
      feedback.phase === "error"
        ? "details-panel__toast details-panel__toast--error"
        : feedback.phase === "success"
        ? "details-panel__toast details-panel__toast--success"
        : "details-panel__toast";
    return <div className={cls}>{feedback.message}</div>;
  };

  const renderContent = () => {
    if (loading && !info) {
      return <div className="details-panel__hint">Loading system info…</div>;
    }
    if (error) {
      return (
        <div className="details-panel__hint details-panel__hint--error">
          <span>{error}</span>
          <button className="btn btn--ghost" onClick={load}>Retry</button>
        </div>
      );
    }
    if (!info) {
      return (
        <div className="details-panel__empty">
          <div className="details-panel__empty-title">No data collected yet</div>
          <div className="details-panel__empty-msg">
            Click "Collect System Info" to gather hardware and OS details from this kiosk.
          </div>
        </div>
      );
    }

    const totalRam = info.totalRamMb ? formatBytes(info.totalRamMb) : null;
    const freeRam = info.freeRamMb ? formatBytes(info.freeRamMb) : null;
    const ramDisplay = totalRam
      ? freeRam
        ? `${freeRam} free / ${totalRam} total`
        : totalRam
      : null;

    return (
      <>
        <section className="details-panel__section">
          <div className="details-panel__section-title">System</div>
          <KvGrid rows={[
            { label: "Hostname", value: info.hostname },
            { label: "OS", value: info.osVersion },
            { label: "IP Address", value: info.ipAddress },
            { label: "Current user", value: info.currentUser },
            { label: "Last boot", value: formatDate(info.lastBoot) },
            { label: "Uptime", value: info.uptime },
          ]} />
        </section>

        <section className="details-panel__section">
          <div className="details-panel__section-title">Hardware</div>
          <KvGrid rows={[
            { label: "CPU cores", value: info.cpuCores ? String(info.cpuCores) : null },
            { label: "RAM", value: ramDisplay },
            { label: "Disk", value: info.diskSummary },
          ]} />
        </section>

        <div className="sysinfo-collected">
          Collected {formatDate(info.collectedAt)}
        </div>
      </>
    );
  };

  return (
    <div className="kiosk-tab-pane">
      <div className="details-panel__section-actions">
        <button
          className={`btn${isPending ? " is-loading" : ""}${justSucceeded ? " is-success" : ""}${justFailed ? " is-error" : ""}`}
          onClick={() => onTrigger("collect_system_info", "Collect System Info")}
          disabled={pending !== null || !can.operate}
          title={!can.operate ? "You do not have permission to perform this action" : undefined}
          aria-busy={isPending}
        >
          {isPending ? "Sending…" : justSucceeded ? "Queued ✓" : justFailed ? "Failed" : "Collect System Info"}
        </button>
      </div>
      {renderFeedback()}
      {renderContent()}
    </div>
  );
};

export default KioskSystemInfoTab;
