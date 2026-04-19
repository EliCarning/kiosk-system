import React from "react";
import PlaceholderPage from "./PlaceholderPage";

const SettingsPage: React.FC = () => (
  <PlaceholderPage
    title="Settings"
    subtitle="Configure roles, integrations, and system preferences"
    description="Role group mapping, agent keys, and system-wide preferences will move here. For now, the existing in-dashboard settings modal remains available."
    bullets={[
      "Role group mapping",
      "Agent key management",
      "Notification preferences",
    ]}
  />
);

export default SettingsPage;
