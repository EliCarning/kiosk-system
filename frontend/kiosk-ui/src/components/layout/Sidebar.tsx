import React from "react";
import { Organization, Site } from "../../types/org";

interface SidebarProps {
  org: Organization | null;
  selectedSiteId: string | "all";
  selectedDepartmentId: string | "all";
  onSelectSite: (siteId: string | "all") => void;
  onSelectDepartment: (siteId: string, deptId: string | "all") => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  org,
  selectedSiteId,
  selectedDepartmentId,
  onSelectSite,
  onSelectDepartment,
  onOpenSettings,
}) => {
  const renderSite = (site: Site) => {
    const isActive = selectedSiteId === site.id;
    return (
      <div key={site.id} className="sidebar__site">
        <button
          className={`sidebar__site-btn${isActive ? " is-active" : ""}`}
          onClick={() => onSelectSite(site.id)}
        >
          <span className="sidebar__site-name">{site.name}</span>
          <span className="sidebar__site-count">
            {site.departments.reduce((n, d) => n + d.kiosks.length, 0)}
          </span>
        </button>
        {isActive && (
          <ul className="sidebar__depts">
            <li>
              <button
                className={`sidebar__dept${
                  selectedDepartmentId === "all" ? " is-active" : ""
                }`}
                onClick={() => onSelectDepartment(site.id, "all")}
              >
                All departments
              </button>
            </li>
            {site.departments.map((d) => (
              <li key={d.id}>
                <button
                  className={`sidebar__dept${
                    selectedDepartmentId === d.id ? " is-active" : ""
                  }`}
                  onClick={() => onSelectDepartment(site.id, d.id)}
                >
                  <span>{d.name}</span>
                  <span className="sidebar__dept-count">{d.kiosks.length}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__brand-mark">K</div>
        <div>
          <div className="sidebar__org">{org?.name ?? "Loading..."}</div>
          <div className="sidebar__org-sub">Kiosk Operations</div>
        </div>
      </div>

      <nav className="sidebar__nav">
        <button
          className={`sidebar__site-btn${
            selectedSiteId === "all" ? " is-active" : ""
          }`}
          onClick={() => onSelectSite("all")}
        >
          <span className="sidebar__site-name">All sites</span>
          <span className="sidebar__site-count">
            {org?.sites.reduce(
              (n, s) => n + s.departments.reduce((m, d) => m + d.kiosks.length, 0),
              0
            ) ?? 0}
          </span>
        </button>
        <div className="sidebar__section-label">Sites</div>
        {org?.sites.map(renderSite)}
      </nav>

      <div className="sidebar__footer">
        <button className="btn btn--ghost" onClick={onOpenSettings}>
          Settings
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
