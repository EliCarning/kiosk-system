import React from "react";
import PlaceholderPage from "./PlaceholderPage";

const ActivityPage: React.FC = () => (
  <PlaceholderPage
    title="Activity"
    subtitle="Real-time timeline of what is happening in your estate"
    description="A unified stream combining heartbeats, alerts, and commands with live updates is on the roadmap."
    bullets={[
      "Real-time event stream",
      "Filter by kiosk, site, or event type",
      "Searchable history",
    ]}
  />
);

export default ActivityPage;
