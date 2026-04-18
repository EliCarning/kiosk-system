import React from "react";
import { Kiosk } from "../../types/org";
import StatusBadge from "../StatusBadge";
import CheckBadge from "./CheckBadge";
import StatusHistory from "./StatusHistory";

interface KioskCardProps {
  kiosk: Kiosk;
  selected: boolean;
  onSelect: (kiosk: Kiosk) => void;
}

const KioskCard: React.FC<KioskCardProps> = ({ kiosk, selected, onSelect }) => (
  <button
    className={`kiosk-card${selected ? " is-selected" : ""}`}
    onClick={() => onSelect(kiosk)}
  >
    <div className="kiosk-card__head">
      <div>
        <div className="kiosk-card__name">{kiosk.displayName}</div>
        <div className="kiosk-card__sub">
          <code>{kiosk.machineName}</code>
          <span className="kiosk-card__dot-sep">·</span>
          <span className="kiosk-card__ip">{kiosk.ipAddress}</span>
        </div>
      </div>
      <StatusBadge status={kiosk.status} />
    </div>

    <div className="kiosk-card__checks">
      {kiosk.checks.map((c) => (
        <CheckBadge key={c.kind} check={c} />
      ))}
    </div>

    <StatusHistory history={kiosk.history} />
  </button>
);

export default KioskCard;
