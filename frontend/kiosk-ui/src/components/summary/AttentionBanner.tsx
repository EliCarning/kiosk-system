import React from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  offlineKiosks: number;
  activeAlerts: number;
  failedCommands24h: number;
}

const AttentionBanner: React.FC<Props> = ({
  offlineKiosks,
  activeAlerts,
  failedCommands24h,
}) => {
  const navigate = useNavigate();

  type Item = { label: string; path: string; severity: "error" | "warning" };
  const items: Item[] = [
    ...(offlineKiosks > 0
      ? [{ label: `${offlineKiosks} offline`, path: "/kiosks?status=offline", severity: "error" as const }]
      : []),
    ...(activeAlerts > 0
      ? [{ label: `${activeAlerts} alert${activeAlerts === 1 ? "" : "s"}`, path: "/alerts", severity: "error" as const }]
      : []),
    ...(failedCommands24h > 0
      ? [{ label: `${failedCommands24h} failed cmd${failedCommands24h === 1 ? "" : "s"} · 24h`, path: "/commands", severity: "warning" as const }]
      : []),
  ];

  if (items.length === 0) return null;

  return (
    <div className="attention-banner" role="alert" aria-label="Issues requiring attention">
      <span className="attention-banner__label">Needs attention</span>
      <div className="attention-banner__items">
        {items.map((item) => (
          <button
            key={item.path}
            className={`attention-banner__chip attention-banner__chip--${item.severity}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default AttentionBanner;
