import React from "react";

interface SummaryCardProps {
  label: string;
  value: number | string;
  accent?: "default" | "online" | "offline" | "warning";
  hint?: string;
  onClick?: () => void;
}

const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  accent = "default",
  hint,
  onClick,
}) => {
  return (
    <div
      className={`summary-card summary-card--${accent}${onClick ? " summary-card--clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="summary-card__label">{label}</div>
      <div className="summary-card__value">{value}</div>
      {hint && <div className="summary-card__hint">{hint}</div>}
    </div>
  );
};

export default SummaryCard;
