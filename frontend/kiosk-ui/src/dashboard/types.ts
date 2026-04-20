import type { LayoutItem } from "react-grid-layout";
import type { GlobalSummary, IssuesResponse } from "../api/dashboard";
import type { KioskCommand } from "../types/command";
import type { Organization } from "../types/org";

export type WidgetType =
  | "stats"
  | "attention"
  | "issues"
  | "commands"
  | "site-grid";

export interface DashboardState {
  layouts: LayoutItem[];
  types: Record<string, WidgetType>;
}

export interface DashboardContext {
  globalSummary: GlobalSummary | null;
  summaryLoading: boolean;
  commandsInProgress: number;
  globalIssues: IssuesResponse | null;
  recentCommands: KioskCommand[];
  recentCommandsLoading: boolean;
  recentCommandsError: string | null;
  refreshRecentCommands: () => void;
  org: Organization | null;
  alertsLoading: boolean;
  onSelectMachine: (name: string) => void;
  onSelectSite: (siteId: string) => void;
}
