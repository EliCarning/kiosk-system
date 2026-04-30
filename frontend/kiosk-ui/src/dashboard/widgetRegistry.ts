import type { WidgetType } from "./types";

export interface WidgetMeta {
  type: WidgetType;
  label: string;
  description: string;
  defaultW: number;
  defaultH: number;
  minW: number;
  minH: number;
}

export const WIDGET_REGISTRY: Record<WidgetType, WidgetMeta> = {
  stats: {
    type: "stats",
    label: "KPI Stats",
    description: "Online kiosks, alerts, and commands in progress",
    defaultW: 12,
    defaultH: 3,
    minW: 4,
    minH: 2,
  },
  attention: {
    type: "attention",
    label: "Needs Attention",
    description: "Offline kiosks, active alerts, and failed commands",
    defaultW: 12,
    defaultH: 2,
    minW: 6,
    minH: 2,
  },
  issues: {
    type: "issues",
    label: "Issues Panel",
    description: "Recent alerts, failed commands, and problematic kiosks",
    defaultW: 6,
    defaultH: 7,
    minW: 4,
    minH: 4,
  },
  commands: {
    type: "commands",
    label: "Recent Commands",
    description: "Latest commands dispatched to kiosks",
    defaultW: 6,
    defaultH: 7,
    minW: 4,
    minH: 4,
  },
  "site-grid": {
    type: "site-grid",
    label: "Site Overview",
    description: "Overview cards for all configured sites",
    defaultW: 12,
    defaultH: 4,
    minW: 6,
    minH: 3,
  },
  "alerts-feed": {
    type: "alerts-feed",
    label: "Live Alerts Feed",
    description: "Real-time stream of active alerts across the fleet",
    defaultW: 6,
    defaultH: 7,
    minW: 4,
    minH: 4,
  },
  "quick-actions": {
    type: "quick-actions",
    label: "Quick Actions",
    description: "Fire commands directly at any machine from the dashboard",
    defaultW: 6,
    defaultH: 7,
    minW: 4,
    minH: 4,
  },
  "trend-chart": {
    type: "trend-chart",
    label: "Online Trend",
    description: "Time-series chart of fleet online status",
    defaultW: 12,
    defaultH: 5,
    minW: 6,
    minH: 3,
  },
};

export const WIDGET_ORDER: WidgetType[] = [
  "stats",
  "attention",
  "site-grid",
  "issues",
  "commands",
  "alerts-feed",
  "quick-actions",
  "trend-chart",
];
