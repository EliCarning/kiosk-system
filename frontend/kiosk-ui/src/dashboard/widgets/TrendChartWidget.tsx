import React from "react";
import OnlineTrendChart from "../charts/OnlineTrendChart";
import type { DashboardContext } from "../types";

interface Props {
  ctx: DashboardContext;
}

const TrendChartWidget: React.FC<Props> = ({ ctx }) => (
  <OnlineTrendChart
    globalSummary={ctx.globalSummary}
    loading={ctx.summaryLoading}
  />
);

export default TrendChartWidget;
