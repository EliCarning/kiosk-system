import React from "react";

import type { DashboardContext } from "./types";
import { useDashboardPrefs, type DashboardPrefs } from "../hooks/useDashboardPrefs";
import DashboardKpiRow from "./DashboardKpiRow";
import OnlineTrendChart from "./charts/OnlineTrendChart";
import CommandStatusChart from "./charts/CommandStatusChart";
import AlertsByTypeChart from "./charts/AlertsByTypeChart";
import IssuesWidget from "./widgets/IssuesWidget";
import SiteGridWidget from "./widgets/SiteGridWidget";
import AttentionWidget from "./widgets/AttentionWidget";

interface Props {
  ctx: DashboardContext;
  editMode?: boolean;
  onEditModeClose?: () => void;
}

const EDIT_WIDGETS: { key: keyof DashboardPrefs; label: string }[] = [
  { key: "showKpis",     label: "KPI Cards" },
  { key: "showSiteGrid", label: "Site Overview" },
  { key: "showIssues",   label: "Issues Panel" },
  { key: "showCommands", label: "Charts" },
];

const DashboardGrid: React.FC<Props> = ({ ctx, editMode = false, onEditModeClose }) => {
  const { prefs, update: updatePrefs } = useDashboardPrefs();

  const hasAttention =
    ctx.globalSummary &&
    (ctx.globalSummary.offlineKiosks > 0 ||
      ctx.globalSummary.activeAlerts > 0 ||
      ctx.globalSummary.failedCommandsLast24h > 0);

  return (
    <div className="dash-pro">

      {/* Edit mode toolbar */}
      {editMode && (
        <div className="dash-edit-bar">
          <span className="dash-edit-bar__title">Visible sections</span>
          {EDIT_WIDGETS.map(({ key, label }) => (
            <button
              key={key}
              className={`dash-edit-toggle${prefs[key] ? " is-on" : ""}`}
              onClick={() => updatePrefs({ [key]: !prefs[key] })}
              aria-pressed={prefs[key]}
            >
              <span className="dash-edit-toggle__dot" />
              {label}
            </button>
          ))}
          <button
            className="btn btn--ghost dash-edit-bar__close"
            onClick={onEditModeClose}
          >
            Done
          </button>
        </div>
      )}

      {/* Row 0: Attention banner (conditional) */}
      {hasAttention && (
        <div className="dash-pro__banner">
          <AttentionWidget ctx={ctx} />
        </div>
      )}

      {/* Row 1: KPI Cards */}
      {prefs.showKpis && (
        <DashboardKpiRow
          summary={ctx.globalSummary}
          commandsInProgress={ctx.commandsInProgress}
          loading={ctx.summaryLoading}
        />
      )}

      {/* Row 2: Full-width trend chart */}
      {prefs.showCommands && (
        <OnlineTrendChart
          globalSummary={ctx.globalSummary}
          loading={ctx.summaryLoading}
        />
      )}

      {/* Row 3: Two charts side by side */}
      {prefs.showCommands && (
        <div className="dash-pro__row dash-pro__row--half">
          <CommandStatusChart
            commands={ctx.recentCommands}
            loading={ctx.recentCommandsLoading}
          />
          <AlertsByTypeChart
            globalIssues={ctx.globalIssues}
            loading={ctx.summaryLoading || ctx.alertsLoading}
          />
        </div>
      )}

      {/* Row 4: Issues panel + Site grid */}
      <div className="dash-pro__row dash-pro__row--issues">
        {prefs.showIssues && <IssuesWidget ctx={ctx} />}
        {prefs.showSiteGrid && ctx.org && ctx.org.sites.length > 0 && (
          <div className="dash-pro__sites">
            <div className="chart-card__head chart-card__head--standalone">
              <span className="chart-card__title">Sites</span>
              <span className="chart-card__sub">
                {ctx.org.sites.length} site{ctx.org.sites.length === 1 ? "" : "s"}
              </span>
            </div>
            <SiteGridWidget ctx={ctx} />
          </div>
        )}
      </div>

    </div>
  );
};

export default DashboardGrid;
