import React from "react";
import PlaceholderPage from "./PlaceholderPage";

const SitesPage: React.FC = () => (
  <PlaceholderPage
    title="Sites"
    subtitle="Manage physical locations and their kiosks"
    description="Site management (create, rename, assign kiosks) will live here."
    bullets={[
      "Create and rename sites",
      "Per-site health and issues",
      "Assign kiosks to sites",
    ]}
  />
);

export default SitesPage;
