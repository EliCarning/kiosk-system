import React, { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import AppSidebar from "./AppSidebar";

const STORAGE_KEY = "kiosk-ui:sidebar-collapsed";

const readInitialCollapsed = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const AppShell: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(readInitialCollapsed);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const toggle = useCallback(() => setCollapsed((v) => !v), []);

  return (
    <div className={`app-shell${collapsed ? " app-shell--collapsed" : ""}`}>
      <AppSidebar collapsed={collapsed} onToggle={toggle} />
      <main className="app-shell__main">
        <Outlet />
      </main>
    </div>
  );
};

export default AppShell;
