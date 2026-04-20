import React from "react";
import RecentCommandsPanel from "../../components/summary/RecentCommandsPanel";
import type { DashboardContext } from "../types";

interface Props {
  ctx: DashboardContext;
}

const CommandsWidget: React.FC<Props> = ({ ctx }) => (
  <RecentCommandsPanel
    commands={ctx.recentCommands}
    loading={ctx.recentCommandsLoading}
    error={ctx.recentCommandsError}
    onRetry={ctx.refreshRecentCommands}
    onSelectMachine={ctx.onSelectMachine}
  />
);

export default CommandsWidget;
