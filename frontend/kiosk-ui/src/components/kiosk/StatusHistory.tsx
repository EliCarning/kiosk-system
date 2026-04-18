import React from "react";
import { KioskHistoryPoint } from "../../types/org";

interface StatusHistoryProps {
  history: KioskHistoryPoint[];
}

const StatusHistory: React.FC<StatusHistoryProps> = ({ history }) => (
  <div className="history-strip" aria-label="Recent status history">
    {history.map((p, i) => (
      <span
        key={`${p.timestamp}-${i}`}
        className={`history-cell history-cell--${p.state}`}
        title={`${new Date(p.timestamp).toLocaleTimeString()} · ${p.state}`}
      />
    ))}
  </div>
);

export default StatusHistory;
