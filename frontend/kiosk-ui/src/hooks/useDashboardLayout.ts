import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutItem } from "react-grid-layout";
import type { DashboardState, WidgetType } from "../dashboard/types";
import type { WidgetMeta } from "../dashboard/widgetRegistry";
import { fetchDashboardLayout, saveDashboardLayout } from "../api/layout";

const STORAGE_KEY = "kiosk-ui:dashboard-layout-v2";

const DEFAULT_STATE: DashboardState = {
  layouts: [
    { i: "stats-1",     x: 0, y: 0,  w: 12, h: 3, minW: 4,  minH: 2 },
    { i: "attention-1", x: 0, y: 3,  w: 12, h: 2, minW: 6,  minH: 2 },
    { i: "site-grid-1", x: 0, y: 5,  w: 12, h: 4, minW: 6,  minH: 3 },
    { i: "issues-1",    x: 0, y: 9,  w: 6,  h: 7, minW: 4,  minH: 4 },
    { i: "commands-1",  x: 6, y: 9,  w: 6,  h: 7, minW: 4,  minH: 4 },
  ],
  types: {
    "stats-1":     "stats",
    "attention-1": "attention",
    "site-grid-1": "site-grid",
    "issues-1":    "issues",
    "commands-1":  "commands",
  },
};

function loadFromStorage(): DashboardState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DashboardState;
      if (parsed?.layouts?.length && parsed?.types) return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function saveToStorage(state: DashboardState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function useDashboardLayout() {
  const [state, setState] = useState<DashboardState>(
    () => loadFromStorage() ?? DEFAULT_STATE
  );

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const persist = useCallback((next: DashboardState) => {
    saveToStorage(next);
    if (saveTimerRef.current !== undefined)
      clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveDashboardLayout(next);
    }, 1500);
  }, []);

  // Hydrate from API on mount — overrides localStorage if remote layout exists
  useEffect(() => {
    fetchDashboardLayout()
      .then((remote) => {
        if (remote) {
          setState(remote);
          saveToStorage(remote);
        }
      })
      .catch(() => {});
  }, []);

  const updateLayouts = useCallback(
    (layouts: LayoutItem[]) => {
      setState((prev) => {
        const next: DashboardState = { ...prev, layouts };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const addWidget = useCallback(
    (type: WidgetType, meta: WidgetMeta) => {
      setState((prev) => {
        const id = `${type}-${Date.now()}`;
        const maxY = prev.layouts.reduce(
          (m, l) => Math.max(m, l.y + l.h),
          0
        );
        const newItem: LayoutItem = {
          i: id,
          x: 0,
          y: maxY,
          w: meta.defaultW,
          h: meta.defaultH,
          minW: meta.minW,
          minH: meta.minH,
        };
        const next: DashboardState = {
          layouts: [...prev.layouts, newItem],
          types: { ...prev.types, [id]: type },
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const removeWidget = useCallback(
    (id: string) => {
      setState((prev) => {
        const { [id]: _removed, ...types } = prev.types;
        const next: DashboardState = {
          layouts: prev.layouts.filter((l) => l.i !== id),
          types,
        };
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const resetToDefault = useCallback(() => {
    setState(DEFAULT_STATE);
    persist(DEFAULT_STATE);
  }, [persist]);

  const applyPreset = useCallback(
    (preset: DashboardState) => {
      setState(preset);
      persist(preset);
    },
    [persist]
  );

  return { state, updateLayouts, addWidget, removeWidget, resetToDefault, applyPreset };
}
