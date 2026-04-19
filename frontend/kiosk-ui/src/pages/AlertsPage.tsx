import React from "react";
import PlaceholderPage from "./PlaceholderPage";

const AlertsPage: React.FC = () => (
  <PlaceholderPage
    title="Alerts"
    subtitle="Full view of active and historical alerts"
    description="A full alerts console with filters, history, and resolution tooling is on the way. The in-dashboard alerts indicator stays available from any page."
    bullets={[
      "Filter by type, site, and status",
      "Bulk resolve",
      "Alert history and audit log",
    ]}
  />
);

export default AlertsPage;
