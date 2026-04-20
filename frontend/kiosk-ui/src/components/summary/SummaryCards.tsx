import React from "react";
import SummaryCard from "../SummaryCard";
import {
  DepartmentSummary,
  GlobalSummary,
  SiteSummary,
} from "../../api/dashboard";

type Kpi = {
  label: string;
  value: number | string;
  hint?: string;
  accent?: "default" | "online" | "offline" | "warning";
};

const healthPct = (online: number, total: number): number =>
  total === 0 ? 0 : Math.round((online / total) * 100);

const globalKpis = (s: GlobalSummary): Kpi[] => [
  {
    label: "Total kiosks",
    value: s.totalKiosks,
    hint: `${s.totalSites} sites · ${s.totalDepartments} departments`,
  },
  {
    label: "Online",
    value: s.onlineKiosks,
    accent: "online",
    hint: `${healthPct(s.onlineKiosks, s.totalKiosks)}% online`,
  },
  {
    label: "Offline",
    value: s.offlineKiosks,
    accent: s.offlineKiosks > 0 ? "offline" : "default",
    hint: s.offlineKiosks > 0 ? "Needs attention" : "All reachable",
  },
  {
    label: "Active alerts",
    value: s.activeAlerts,
    accent: s.activeAlerts > 0 ? "offline" : "default",
    hint: `${s.failedCommandsLast24h} failed cmds · 24h`,
  },
];

const siteKpis = (s: SiteSummary): Kpi[] => [
  {
    label: "Kiosks",
    value: s.totalKiosks,
    hint: `${s.totalDepartments} departments`,
  },
  {
    label: "Online",
    value: s.onlineKiosks,
    accent: "online",
    hint: `${healthPct(s.onlineKiosks, s.totalKiosks)}% online`,
  },
  {
    label: "Offline",
    value: s.offlineKiosks,
    accent: s.offlineKiosks > 0 ? "offline" : "default",
  },
  {
    label: "Active alerts",
    value: s.activeAlerts,
    accent: s.activeAlerts > 0 ? "offline" : "default",
    hint: `${s.failedCommandsLast24h} failed cmds · 24h`,
  },
];

const deptKpis = (d: DepartmentSummary): Kpi[] => [
  {
    label: "Kiosks",
    value: d.totalKiosks,
    hint: `${healthPct(d.onlineKiosks, d.totalKiosks)}% online`,
  },
  {
    label: "Online",
    value: d.onlineKiosks,
    accent: "online",
  },
  {
    label: "Offline",
    value: d.offlineKiosks,
    accent: d.offlineKiosks > 0 ? "offline" : "default",
  },
  {
    label: "Active alerts",
    value: d.activeAlerts,
    accent: d.activeAlerts > 0 ? "offline" : "default",
    hint: `${d.failedCommandsLast24h} failed cmds · 24h`,
  },
];

interface Props {
  scope: "global" | "site" | "department";
  global?: GlobalSummary | null;
  site?: SiteSummary | null;
  department?: DepartmentSummary | null;
  loading?: boolean;
  commandsInProgress?: number;
}

const SummaryCards: React.FC<Props> = ({
  scope,
  global,
  site,
  department,
  loading,
  commandsInProgress,
}) => {
  let cards: Kpi[] = [];
  if (scope === "global" && global) cards = globalKpis(global);
  else if (scope === "site" && site) cards = siteKpis(site);
  else if (scope === "department" && department) cards = deptKpis(department);

  if (typeof commandsInProgress === "number") {
    cards = [
      ...cards,
      {
        label: "Commands in progress",
        value: commandsInProgress,
        accent: commandsInProgress > 0 ? "warning" : "default",
        hint:
          commandsInProgress > 0
            ? "Pending or running"
            : "No active dispatches",
      },
    ];
  }

  if (cards.length === 0) {
    return (
      <section className="summary-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`summary-card summary-card--default${
              loading ? " summary-card--loading" : ""
            }`}
          >
            <div className="summary-card__label">—</div>
            <div className="summary-card__value">—</div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="summary-grid">
      {cards.map((k) => (
        <SummaryCard
          key={k.label}
          label={k.label}
          value={k.value}
          accent={k.accent ?? "default"}
          hint={k.hint}
        />
      ))}
    </section>
  );
};

export default SummaryCards;
