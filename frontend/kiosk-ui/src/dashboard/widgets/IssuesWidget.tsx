import React from "react";
import IssuesPanel from "../../components/summary/IssuesPanel";
import type { DashboardContext } from "../types";

interface Props {
  ctx: DashboardContext;
}

const IssuesWidget: React.FC<Props> = ({ ctx }) => (
  <IssuesPanel
    title="Recent issues · all sites"
    issues={ctx.globalIssues}
    loading={ctx.summaryLoading || ctx.alertsLoading || ctx.recentCommandsLoading}
    onSelectMachine={ctx.onSelectMachine}
    emptyMessage="No active issues across all sites."
  />
);

export default IssuesWidget;
