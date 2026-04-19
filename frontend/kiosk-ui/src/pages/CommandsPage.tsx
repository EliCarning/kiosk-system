import React from "react";
import PlaceholderPage from "./PlaceholderPage";

const CommandsPage: React.FC = () => (
  <PlaceholderPage
    title="Commands"
    subtitle="Track every command dispatched to kiosks"
    description="A global command feed with status, machine, and outcome will live here."
    bullets={[
      "Filter by status (pending/running/completed/failed)",
      "Retry failed commands",
      "Audit of who issued each command",
    ]}
  />
);

export default CommandsPage;
