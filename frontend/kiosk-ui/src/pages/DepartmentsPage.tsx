import React from "react";
import PlaceholderPage from "./PlaceholderPage";

const DepartmentsPage: React.FC = () => (
  <PlaceholderPage
    title="Departments"
    subtitle="Organise kiosks into departments within each site"
    description="Department management, grouping, and per-department KPIs will be surfaced here."
    bullets={[
      "Create and rename departments",
      "Move kiosks between departments",
      "Per-department summaries",
    ]}
  />
);

export default DepartmentsPage;
