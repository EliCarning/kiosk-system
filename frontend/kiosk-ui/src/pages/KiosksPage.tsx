import React from "react";
import PlaceholderPage from "./PlaceholderPage";

const KiosksPage: React.FC = () => (
  <PlaceholderPage
    title="Kiosks"
    subtitle="Flat list view of every kiosk across sites and departments"
    description="A unified table of kiosks with filters for status, site, and department is coming here."
    bullets={[
      "Searchable table of all kiosks",
      "Bulk actions (reboot, restart service)",
      "Export to CSV",
    ]}
  />
);

export default KiosksPage;
