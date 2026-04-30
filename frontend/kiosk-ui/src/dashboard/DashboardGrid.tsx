import React from "react";
import { Responsive } from "react-grid-layout";
import "react-grid-layout/css/styles.css";

import type { DashboardContext, WidgetType } from "./types";
import { useDashboardLayout } from "../hooks/useDashboardLayout";
import { WIDGET_REGISTRY } from "./widgetRegistry";
import DashboardToolbar from "./DashboardToolbar";

import AttentionWidget from "./widgets/AttentionWidget";
import StatsWidget from "./widgets/StatsWidget";
import IssuesWidget from "./widgets/IssuesWidget";
import CommandsWidget from "./widgets/CommandsWidget";
import SiteGridWidget from "./widgets/SiteGridWidget";
import AlertsFeedWidget from "./widgets/AlertsFeedWidget";
import QuickActionsWidget from "./widgets/QuickActionsWidget";
import TrendChartWidget from "./widgets/TrendChartWidget";

const RGL = Responsive;

interface Props {
  ctx: DashboardContext;
  editMode?: boolean;
  onEditModeClose?: () => void;
}

const WIDGET_TITLES: Record<WidgetType, string> = {
  stats: "KPI Stats",
  attention: "Needs Attention",
  issues: "Issues Panel",
  commands: "Recent Commands",
  "site-grid": "Site Overview",
  "alerts-feed": "Live Alerts",
  "quick-actions": "Quick Actions",
  "trend-chart": "Online Trend",
};

const renderWidgetContent = (
  type: WidgetType,
  ctx: DashboardContext
): React.ReactNode => {
  switch (type) {
    case "stats":
      return <StatsWidget ctx={ctx} />;
    case "attention":
      return <AttentionWidget ctx={ctx} />;
    case "issues":
      return <IssuesWidget ctx={ctx} />;
    case "commands":
      return <CommandsWidget ctx={ctx} />;
    case "site-grid":
      return <SiteGridWidget ctx={ctx} />;
    case "alerts-feed":
      return <AlertsFeedWidget ctx={ctx} />;
    case "quick-actions":
      return <QuickActionsWidget ctx={ctx} />;
    case "trend-chart":
      return <TrendChartWidget ctx={ctx} />;
    default:
      return null;
  }
};

const DashboardGrid: React.FC<Props> = ({
  ctx,
  editMode = false,
  onEditModeClose,
}) => {
  const {
    state,
    updateLayouts,
    addWidget,
    removeWidget,
    resetToDefault,
    applyPreset,
  } = useDashboardLayout();

  return (
    <div className="dash-grid-root w-full">
      {editMode && (
        <DashboardToolbar
          state={state}
          onAddWidget={(type) => addWidget(type, WIDGET_REGISTRY[type])}
          onResetToDefault={resetToDefault}
          onApplyPreset={applyPreset}
          onClose={onEditModeClose ?? (() => {})}
        />
      )}

      <RGL
        className="layout"
        width={window.innerWidth - 320}
        layouts={{ lg: state.layouts }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 8, xs: 4, xxs: 2 }}
        rowHeight={60}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        onLayoutChange={(_, allLayouts) => updateLayouts(allLayouts.lg ?? [])}
        isDraggable={editMode}
        isResizable={editMode}
        draggableHandle=".widget-handle"
        resizeHandles={["se"]}
        useCSSTransforms
        compactType="vertical"
        preventCollision={false}
      >
        {state.layouts.map((l) => {
          const type = state.types[l.i];
          if (!type) return null;

          return (
            <div
              key={l.i}
              className={`widget-cell${
                editMode ? " widget-cell--editing" : ""
              }`}
            >
              {editMode && (
                <div className="widget-handle">
                  <span className="widget-handle__icon">⠿</span>
                  <span className="widget-handle__title">
                    {WIDGET_TITLES[type] ?? type}
                  </span>
                  <button
                    className="widget-handle__remove"
                    onClick={() => removeWidget(l.i)}
                    title="Remove widget"
                    type="button"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div
                className={`widget-body${
                  editMode ? " widget-body--editing" : ""
                }`}
              >
                {renderWidgetContent(type, ctx)}
              </div>
            </div>
          );
        })}
      </RGL>
    </div>
  );
};

export default DashboardGrid;