import React from "react";
import AlertsIndicator from "../alerts/AlertsIndicator";

export type StatusFilter = "all" | "online" | "offline" | "warning";

interface TopbarProps {
  search: string;
  onSearchChange: (s: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdated: Date | null;
  sidePanelOpen?: boolean;
  onToggleSidePanel?: () => void;
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "warning", label: "Warning" },
];

const PanelIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M9 4v16" />
  </svg>
);

const Topbar: React.FC<TopbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  refreshing,
  lastUpdated,
  sidePanelOpen,
  onToggleSidePanel,
}) => {
  return (
    <div className="topbar">
      <div className="topbar__filters">
        {onToggleSidePanel && (
          <button
            type="button"
            className={`btn btn--ghost topbar__side-toggle${
              sidePanelOpen ? " is-active" : ""
            }`}
            onClick={onToggleSidePanel}
            aria-pressed={sidePanelOpen ? true : false}
            title={sidePanelOpen ? "Hide hierarchy" : "Show hierarchy"}
          >
            <PanelIcon />
            <span>Hierarchy</span>
          </button>
        )}
        <input
          type="search"
          className="input"
          placeholder="Search kiosks, IPs..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <select
          className="input"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
        >
          {statusOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="topbar__actions">
        <AlertsIndicator />
        {lastUpdated && (
          <span className="topbar__timestamp">
            Updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
        <button
          className="btn btn--primary"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>
    </div>
  );
};

export default Topbar;
