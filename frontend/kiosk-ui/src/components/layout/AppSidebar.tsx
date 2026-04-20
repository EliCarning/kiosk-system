import React from "react";
import { NavLink } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import GlobalSearch from "../search/GlobalSearch";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

const Icon = ({ d }: { d: string }) => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d={d} />
  </svg>
);

const NAV_ITEMS: NavItem[] = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: (
      <Icon d="M3 13h7V3H3v10zm0 8h7v-6H3v6zm11 0h7V11h-7v10zm0-18v6h7V3h-7z" />
    ),
  },
  {
    to: "/kiosks",
    label: "Kiosks",
    icon: <Icon d="M3 5h18v11H3zM8 20h8M12 16v4" />,
  },
  {
    to: "/departments",
    label: "Departments",
    icon: <Icon d="M3 4h7v7H3zM14 4h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />,
  },
  {
    to: "/alerts",
    label: "Alerts",
    icon: <Icon d="M12 3a6 6 0 00-6 6v4l-2 3h16l-2-3V9a6 6 0 00-6-6zM10 19a2 2 0 004 0" />,
  },
  {
    to: "/commands",
    label: "Commands",
    icon: <Icon d="M4 6l5 6-5 6M12 18h8" />,
  },
  {
    to: "/activity",
    label: "Activity",
    icon: <Icon d="M3 12h4l3-8 4 16 3-8h4" />,
  },
  {
    to: "/settings",
    label: "Settings",
    icon: (
      <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.1-1.2l2-1.6-2-3.4-2.4.9a7 7 0 00-2.1-1.2L14 3h-4l-.4 2.5a7 7 0 00-2.1 1.2l-2.4-.9-2 3.4 2 1.6A7 7 0 005 12c0 .4 0 .8.1 1.2l-2 1.6 2 3.4 2.4-.9c.6.5 1.3.9 2.1 1.2L10 21h4l.4-2.5c.8-.3 1.5-.7 2.1-1.2l2.4.9 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
    ),
  },
];

const HamburgerIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

const SunIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="16"
    height="16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

const MoonIcon = () => (
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
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
  </svg>
);

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({ collapsed, onToggle }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <aside
      className={`app-sidebar${collapsed ? " is-collapsed" : ""}`}
      aria-label="Primary navigation"
    >
      <div className="app-sidebar__top">
        <button
          type="button"
          className="app-sidebar__toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <HamburgerIcon />
        </button>
        {!collapsed && (
          <div className="app-sidebar__brand">
            <div className="app-sidebar__brand-mark">K</div>
            <div className="app-sidebar__brand-text">
              <div className="app-sidebar__brand-name">Kiosk Ops</div>
              <div className="app-sidebar__brand-sub">Operations console</div>
            </div>
          </div>
        )}
      </div>

      {!collapsed && (
        <div className="app-sidebar__search">
          <GlobalSearch />
        </div>
      )}

      <nav className="app-sidebar__nav">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `app-sidebar__link${isActive ? " is-active" : ""}`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="app-sidebar__icon">{item.icon}</span>
            {!collapsed && (
              <span className="app-sidebar__label">{item.label}</span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="app-sidebar__footer">
        <button
          type="button"
          className="app-sidebar__theme"
          onClick={toggleTheme}
          aria-label={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          title={
            theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
        >
          <span className="app-sidebar__theme-icon">
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </span>
          {!collapsed && (
            <span className="app-sidebar__theme-label">
              {theme === "dark" ? "Light mode" : "Dark mode"}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default AppSidebar;
