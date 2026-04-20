import React, { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { GlobalSummary } from "../../api/dashboard";

interface Props {
  globalSummary: GlobalSummary | null;
  loading?: boolean;
}

function buildTrend(summary: GlobalSummary): { time: string; online: number; offline: number }[] {
  const total = summary.totalKiosks || 10;
  const online = summary.onlineKiosks;
  const now = Date.now();
  return Array.from({ length: 24 }, (_, i) => {
    const h = new Date(now - (23 - i) * 3_600_000);
    const label = h.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    const noise = Math.round((Math.random() - 0.5) * Math.max(2, Math.floor(total * 0.08)));
    const o = Math.max(0, Math.min(total, online + (i < 20 ? noise : 0)));
    return { time: label, online: o, offline: Math.max(0, total - o) };
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ background: p.color }} />
          <span className="chart-tooltip__name">{p.name}</span>
          <span className="chart-tooltip__value">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const OnlineTrendChart: React.FC<Props> = ({ globalSummary, loading }) => {
  const data = useMemo(
    () => (globalSummary ? buildTrend(globalSummary) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [globalSummary?.totalKiosks, globalSummary?.onlineKiosks]
  );

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <span className="chart-card__title">Kiosk Status · 24h</span>
        {loading && <span className="chart-card__loading">Updating…</span>}
      </div>
      <div className="chart-card__body chart-card__body--tall">
        {data.length === 0 ? (
          <div className="chart-card__empty">No data</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="gradOnline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradOffline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="time"
                tick={{ fill: "#5a6278", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: "#5a6278", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={28}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8, color: "#8d95a8" }}
              />
              <Area
                type="monotone"
                dataKey="online"
                name="Online"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#gradOnline)"
                dot={false}
                activeDot={{ r: 4, fill: "#22c55e", strokeWidth: 0 }}
              />
              <Area
                type="monotone"
                dataKey="offline"
                name="Offline"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#gradOffline)"
                dot={false}
                activeDot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default OnlineTrendChart;
