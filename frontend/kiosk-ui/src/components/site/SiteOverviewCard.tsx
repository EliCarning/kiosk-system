import React from "react";
import { Site } from "../../types/org";

interface SiteOverviewCardProps {
  site: Site;
  onSelect?: () => void;
}

const SiteOverviewCard: React.FC<SiteOverviewCardProps> = ({ site, onSelect }) => {
  const all = site.departments.flatMap((d) => d.kiosks);
  const total = all.length;
  const online = all.filter((k) => k.status.toLowerCase() === "online").length;
  const offline = all.filter((k) => k.status.toLowerCase() === "offline").length;
  const healthPct = total === 0 ? 0 : Math.round((online / total) * 100);

  return (
    <button className="site-card" onClick={onSelect}>
      <div className="site-card__head">
        <div>
          <div className="site-card__name">{site.name}</div>
          <div className="site-card__loc">{site.location}</div>
        </div>
        <div className="site-card__pct">{healthPct}%</div>
      </div>
      <div className="site-card__bar">
        <div
          className="site-card__bar-fill"
          style={{ width: `${healthPct}%` }}
        />
      </div>
      <div className="site-card__stats">
        <span className="site-card__stat">
          <span className="site-card__dot site-card__dot--online" />
          {online} online
        </span>
        <span className="site-card__stat">
          <span className="site-card__dot site-card__dot--offline" />
          {offline} offline
        </span>
        <span className="site-card__stat site-card__stat--muted">
          {site.departments.length} depts · {total} kiosks
        </span>
      </div>
    </button>
  );
};

export default SiteOverviewCard;
