import React from "react";
import SiteOverviewCard from "../../components/site/SiteOverviewCard";
import type { DashboardContext } from "../types";

interface Props {
  ctx: DashboardContext;
}

const SiteGridWidget: React.FC<Props> = ({ ctx }) => {
  const sites = ctx.org?.sites ?? [];
  if (sites.length === 0) return null;
  return (
    <section className="site-grid">
      {sites.map((s) => (
        <SiteOverviewCard
          key={s.id}
          site={s}
          onSelect={() => ctx.onSelectSite(s.id)}
        />
      ))}
    </section>
  );
};

export default SiteGridWidget;
