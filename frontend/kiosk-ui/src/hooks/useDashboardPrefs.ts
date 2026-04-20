import { useCallback, useState } from "react";

const STORAGE_KEY = "kiosk-ui:dashboard-prefs";

export interface DashboardPrefs {
  showKpis: boolean;
  showSiteGrid: boolean;
  showIssues: boolean;
  showCommands: boolean;
}

const DEFAULTS: DashboardPrefs = {
  showKpis: true,
  showSiteGrid: true,
  showIssues: true,
  showCommands: true,
};

function loadPrefs(): DashboardPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<DashboardPrefs>) };
  } catch {
    // ignore
  }
  return { ...DEFAULTS };
}

export function useDashboardPrefs() {
  const [prefs, setPrefs] = useState<DashboardPrefs>(loadPrefs);

  const update = useCallback((patch: Partial<DashboardPrefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { prefs, update };
}
