import React from "react";
import type { GlobalSummary } from "../api/dashboard";

interface Props {
  summary: GlobalSummary | null;
  commandsInProgress: number;
  loading?: boolean;
}

interface KpiDef {
  key: string;
  label: string;
  value: (s: GlobalSummary, cip: number) => number | string;
  accent: "default" | "online" | "offline" | "warning" | "info";
  icon: React.ReactNode;
  hint: (s: GlobalSummary, cip: number) => string;
}

const IconMonitor = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2"/>
    <line x1="8" y1="21" x2="16" y2="21"/>
    <line x1="12" y1="17" x2="12" y2="21"/>
  </svg>
);
const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconWifiOff = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
    <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
    <path d="M10.71 5.05A16 16 0 0 1 22.56 9"/>
    <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
    <circle cx="12" cy="20" r="1" fill="currentColor"/>
  </svg>
);
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);

const KPIS: KpiDef[] = [
  {
    key: "total",
    label: "Total Kiosks",
    value: (s) => s.totalKiosks,
    accent: "default",
    icon: <IconMonitor />,
    hint: (s) => `${s.totalSites} site${s.totalSites === 1 ? "" : "s"} · ${s.totalDepartments} depts`,
  },
  {
    key: "online",
    label: "Online",
    value: (s) => s.onlineKiosks,
    accent: "online",
    icon: <IconCheckCircle />,
    hint: (s) => `${s.totalKiosks ? Math.round((s.onlineKiosks / s.totalKiosks) * 100) : 0}% availability`,
  },
  {
    key: "offline",
    label: "Offline",
    value: (s) => s.offlineKiosks,
    accent: "offline",
    icon: <IconWifiOff />,
    hint: (s) => s.offlineKiosks > 0 ? "Requires attention" : "All reachable",
  },
  {
    key: "alerts",
    label: "Active Alerts",
    value: (s) => s.activeAlerts,
    accent: "warning",
    icon: <IconBell />,
    hint: (s) => `${s.failedCommandsLast24h} failed cmd${s.failedCommandsLast24h === 1 ? "" : "s"} · 24h`,
  },
];

const DashboardKpiRow: React.FC<Props> = ({ summary, commandsInProgress, loading }) => {
  return (
    <div className="kpi-row">
      {KPIS.map((kpi) => {
        const val = summary ? kpi.value(summary, commandsInProgress) : "—";
        const hint = summary ? kpi.hint(summary, commandsInProgress) : "";
        return (
          <div key={kpi.key} className={`kpi-card kpi-card--${kpi.accent}${loading && !summary ? " kpi-card--loading" : ""}`}>
            <div className="kpi-card__icon">{kpi.icon}</div>
            <div className="kpi-card__body">
              <div className="kpi-card__value">{val}</div>
              <div className="kpi-card__label">{kpi.label}</div>
              {hint && <div className="kpi-card__hint">{hint}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardKpiRow;
