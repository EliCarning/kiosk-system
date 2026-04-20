import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { IssuesResponse } from "../../api/dashboard";

interface Props {
  globalIssues: IssuesResponse | null;
  loading?: boolean;
}

const BAR_COLORS = ["#5b8cff", "#818cf8", "#a78bfa", "#c084fc", "#e879f9", "#f472b6"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__dot" style={{ background: BAR_COLORS[0] }} />
        <span className="chart-tooltip__name">Alerts</span>
        <span className="chart-tooltip__value">{payload[0]?.value}</span>
      </div>
    </div>
  );
};

const AlertsByTypeChart: React.FC<Props> = ({ globalIssues, loading }) => {
  const data = useMemo(() => {
    if (!globalIssues?.recentAlerts.length) {
      return [
        { type: "No Data", count: 0 },
      ];
    }
    const counts: Record<string, number> = {};
    for (const a of globalIssues.recentAlerts) {
      const t = a.type || "Unknown";
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([type, count]) => ({ type, count }));
  }, [globalIssues]);

  const hasRealData = (globalIssues?.recentAlerts.length ?? 0) > 0;

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <span className="chart-card__title">Alerts by Type</span>
        {loading && <span className="chart-card__loading">Updating…</span>}
        {!loading && hasRealData && (
          <span className="chart-card__sub">{globalIssues!.recentAlerts.length} alerts</span>
        )}
      </div>
      <div className="chart-card__body">
        {!hasRealData ? (
          <div className="chart-card__empty">No active alerts</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal vertical={false} />
              <XAxis
                dataKey="type"
                tick={{ fill: "#5a6278", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fill: "#5a6278", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={24}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                {data.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default AlertsByTypeChart;
