import React from "react";
import SummaryCards from "../../components/summary/SummaryCards";
import type { DashboardContext } from "../types";

interface Props {
  ctx: DashboardContext;
}

const StatsWidget: React.FC<Props> = ({ ctx }) => (
  <SummaryCards
    scope="global"
    global={ctx.globalSummary}
    loading={ctx.summaryLoading}
    commandsInProgress={ctx.commandsInProgress}
  />
);

export default StatsWidget;
