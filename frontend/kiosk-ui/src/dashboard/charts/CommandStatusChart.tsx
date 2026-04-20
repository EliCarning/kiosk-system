import React, { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { KioskCommand } from "../../types/command";

interface Props {
  commands: KioskCommand[];
  loading?: boolean;
}

const COLORS: Record<string, string> = {
  Completed: "#22c55e",
  Failed:    "#ef4444",
  Pending:   "#f59e0b",
  Running:   "#5b8cff",
};

const RADIAN = Math.PI / 180;
const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.06) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#e8eaf0" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={600}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__row">
        <span className="chart-tooltip__dot" style={{ background: p.payload.fill }} />
        <span className="chart-tooltip__name">{p.name}</span>
        <span className="chart-tooltip__value">{p.value}</span>
      </div>
    </div>
  );
};

const CommandStatusChart: React.FC<Props> = ({ commands, loading }) => {
  const data = useMemo(() => {
    const counts: Record<string, number> = { Completed: 0, Failed: 0, Pending: 0, Running: 0 };
    for (const c of commands) {
      const key = c.status.charAt(0).toUpperCase() + c.status.slice(1).toLowerCase();
      const k = key in counts ? key : "Pending";
      counts[k]++;
    }
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, fill: COLORS[name] ?? "#6b7280" }));
  }, [commands]);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div className="chart-card">
      <div className="chart-card__head">
        <span className="chart-card__title">Command Status</span>
        {loading && <span className="chart-card__loading">Updating…</span>}
        {!loading && <span className="chart-card__sub">{total} total</span>}
      </div>
      <div className="chart-card__body">
        {data.length === 0 ? (
          <div className="chart-card__empty">No commands</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="45%"
                innerRadius="42%"
                outerRadius="68%"
                paddingAngle={3}
                dataKey="value"
                labelLine={false}
                label={renderLabel}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} stroke="rgba(0,0,0,0.2)" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, color: "#8d95a8" }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default CommandStatusChart;
