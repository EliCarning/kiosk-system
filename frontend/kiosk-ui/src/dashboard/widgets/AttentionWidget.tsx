import React from "react";
import AttentionBanner from "../../components/summary/AttentionBanner";
import type { DashboardContext } from "../types";

interface Props {
  ctx: DashboardContext;
}

const AttentionWidget: React.FC<Props> = ({ ctx }) => {
  const s = ctx.globalSummary;
  if (!s) return null;
  return (
    <AttentionBanner
      offlineKiosks={s.offlineKiosks}
      activeAlerts={s.activeAlerts}
      failedCommands24h={s.failedCommandsLast24h}
    />
  );
};

export default AttentionWidget;
