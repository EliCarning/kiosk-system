import React from "react";

interface SummaryCardProps {
  label: string;
  value: number | string;
  accent?: "default" | "online" | "offline" | "warning";
  hint?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  accent = "default",
  hint,
}) => {
  return (
    <div className={`summary-card summary-card--${accent}`}>
      <div className="summary-card__label">{label}</div>
      <div className="summary-card__value">{value}</div>
      {hint && <div className="summary-card__hint">{hint}</div>}
    </div>
  );
};

export default SummaryCard;
