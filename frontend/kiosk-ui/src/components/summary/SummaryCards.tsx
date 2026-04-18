import React from "react";
import SummaryCard from "../SummaryCard";
import { OrgSummary } from "../../types/org";

interface SummaryCardsProps {
  summary: OrgSummary;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({ summary }) => (
  <section className="summary-grid">
    <SummaryCard label="Sites" value={summary.sites} />
    <SummaryCard
      label="Kiosks"
      value={summary.totalKiosks}
      hint="Across all sites"
    />
    <SummaryCard
      label="Online"
      value={summary.online}
      accent="online"
      hint="Reporting normally"
    />
    <SummaryCard
      label="Issues"
      value={summary.offline + summary.warnings}
      accent={summary.offline > 0 ? "offline" : "warning"}
      hint={`${summary.offline} offline · ${summary.warnings} warnings`}
    />
  </section>
);

export default SummaryCards;
