import React from "react";

export type StatusFilter = "all" | "online" | "offline" | "warning";

interface TopbarProps {
  search: string;
  onSearchChange: (s: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (s: StatusFilter) => void;
  onRefresh: () => void;
  refreshing: boolean;
  lastUpdated: Date | null;
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "online", label: "Online" },
  { value: "offline", label: "Offline" },
  { value: "warning", label: "Warning" },
];

const Topbar: React.FC<TopbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  refreshing,
  lastUpdated,
}) => {
  return (
    <div className="topbar">
      <div className="topbar__filters">
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
