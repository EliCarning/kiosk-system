import React from "react";
import { KioskCheck } from "../../types/org";

interface CheckBadgeProps {
  check: KioskCheck;
}

const CheckBadge: React.FC<CheckBadgeProps> = ({ check }) => (
  <span
    className={`check-badge check-badge--${check.state}`}
    title={check.detail ?? check.label}
  >
    <span className="check-badge__dot" />
    {check.label}
  </span>
);

export default CheckBadge;
