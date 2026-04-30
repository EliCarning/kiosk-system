import type { DashboardState } from "./types";

export const PRESET_EXECUTIVE: DashboardState = {
  layouts: [
    { i: "stats-1",       x: 0, y: 0,  w: 12, h: 3, minW: 4,  minH: 2 },
    { i: "attention-1",   x: 0, y: 3,  w: 12, h: 2, minW: 6,  minH: 2 },
    { i: "site-grid-1",   x: 0, y: 5,  w: 12, h: 4, minW: 6,  minH: 3 },
    { i: "trend-chart-1", x: 0, y: 9,  w: 12, h: 5, minW: 6,  minH: 3 },
  ],
  types: {
    "stats-1":       "stats",
    "attention-1":   "attention",
    "site-grid-1":   "site-grid",
    "trend-chart-1": "trend-chart",
  },
};

export const PRESET_OPERATIONS: DashboardState = {
  layouts: [
    { i: "stats-1",         x: 0, y: 0,  w: 12, h: 3, minW: 4, minH: 2 },
    { i: "attention-1",     x: 0, y: 3,  w: 12, h: 2, minW: 6, minH: 2 },
    { i: "issues-1",        x: 0, y: 5,  w: 6,  h: 7, minW: 4, minH: 4 },
    { i: "alerts-feed-1",   x: 6, y: 5,  w: 6,  h: 7, minW: 4, minH: 4 },
    { i: "commands-1",      x: 0, y: 12, w: 6,  h: 7, minW: 4, minH: 4 },
    { i: "quick-actions-1", x: 6, y: 12, w: 6,  h: 7, minW: 4, minH: 4 },
  ],
  types: {
    "stats-1":         "stats",
    "attention-1":     "attention",
    "issues-1":        "issues",
    "alerts-feed-1":   "alerts-feed",
    "commands-1":      "commands",
    "quick-actions-1": "quick-actions",
  },
};

export const PRESET_FLEET: DashboardState = {
  layouts: [
    { i: "stats-1",       x: 0, y: 0,  w: 12, h: 3, minW: 4, minH: 2 },
    { i: "site-grid-1",   x: 0, y: 3,  w: 12, h: 4, minW: 6, minH: 3 },
    { i: "trend-chart-1", x: 0, y: 7,  w: 12, h: 5, minW: 6, minH: 3 },
    { i: "issues-1",      x: 0, y: 12, w: 6,  h: 7, minW: 4, minH: 4 },
    { i: "commands-1",    x: 6, y: 12, w: 6,  h: 7, minW: 4, minH: 4 },
  ],
  types: {
    "stats-1":       "stats",
    "site-grid-1":   "site-grid",
    "trend-chart-1": "trend-chart",
    "issues-1":      "issues",
    "commands-1":    "commands",
  },
};
