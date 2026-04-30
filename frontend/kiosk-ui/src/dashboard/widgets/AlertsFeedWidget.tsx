import React from "react";
import { useAlerts } from "../../context/AlertsContext";
import type { DashboardContext } from "../types";

interface Props {
  ctx: DashboardContext;
}

const formatTime = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const AlertsFeedWidget: React.FC<Props> = ({ ctx }) => {
  const { alerts, loading } = useAlerts();

  return (
    <div className="chart-card alerts-feed-widget">
      <div className="chart-card__head">
        <span className="chart-card__title">Live Alerts</span>
        <span className="chart-card__sub">{alerts.length} active</span>
      </div>
      <div className="alerts-feed">
        {loading && alerts.length === 0 && (
          <div className="alerts-feed__empty">Loading…</div>
        )}
        {!loading && alerts.length === 0 && (
          <div className="alerts-feed__empty">No active alerts — fleet is healthy</div>
        )}
        {alerts.slice(0, 30).map((a) => (
          <div
            key={a.id}
            className={`alerts-feed__item alerts-feed__item--${a.type.toLowerCase()}`}
          >
            <span className="alerts-feed__dot" />
            <div className="alerts-feed__content">
              <button
                className="linklike alerts-feed__machine"
                onClick={() => ctx.onSelectMachine(a.machineName)}
              >
                {a.machineName}
              </button>
              <span className="alerts-feed__type">{a.type}</span>
              <span className="alerts-feed__msg">{a.message}</span>
            </div>
            <span className="alerts-feed__time">{formatTime(a.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsFeedWidget;
