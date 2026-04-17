import React from "react";
import { MachineStatus } from "../types/machine";

interface StatusBadgeProps {
  status: MachineStatus;
}

const statusToVariant = (status: string): string => {
  const normalized = status.toLowerCase();
  if (normalized === "online") return "online";
  if (normalized === "offline") return "offline";
  if (normalized === "warning" || normalized === "degraded") return "warning";
  return "neutral";
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const variant = statusToVariant(status);
  return (
    <span className={`status-badge status-badge--${variant}`}>
      <span className="status-badge__dot" />
      {status}
    </span>
  );
};

export default StatusBadge;
