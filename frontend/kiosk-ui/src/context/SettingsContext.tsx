import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export const REFRESH_INTERVAL_OPTIONS: ReadonlyArray<{
  ms: number;
  label: string;
}> = [
  { ms: 5000, label: "5 seconds" },
  { ms: 10000, label: "10 seconds" },
  { ms: 15000, label: "15 seconds" },
  { ms: 30000, label: "30 seconds" },
];

const VALID_INTERVALS = new Set(REFRESH_INTERVAL_OPTIONS.map((o) => o.ms));

interface SettingsState {
  autoRefresh: boolean;
  setAutoRefresh: (v: boolean) => void;
  intervalMs: number;
  setIntervalMs: (v: number) => void;
}

const STORAGE_KEY = "kiosk-ui:settings";

interface StoredSettings {
  autoRefresh?: boolean;
  intervalMs?: number;
}

const CTX_DEFAULT: SettingsState = {
  autoRefresh: true,
  setAutoRefresh: () => undefined,
  intervalMs: 10000,
  setIntervalMs: () => undefined,
};

const SettingsContext = createContext<SettingsState>(CTX_DEFAULT);

const readStored = (): StoredSettings => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredSettings;
  } catch {
    /* ignore */
  }
  return {};
};

const writeStored = (s: StoredSettings): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const initial = readStored();

  const [autoRefresh, setAutoRefreshState] = useState<boolean>(
    initial.autoRefresh ?? true
  );
  const [intervalMs, setIntervalMsState] = useState<number>(
    initial.intervalMs !== undefined && VALID_INTERVALS.has(initial.intervalMs)
      ? initial.intervalMs
      : 10000
  );

  useEffect(() => {
    writeStored({ autoRefresh, intervalMs });
  }, [autoRefresh, intervalMs]);

  const setAutoRefresh = useCallback((v: boolean) => setAutoRefreshState(v), []);
  const setIntervalMs = useCallback((v: number) => setIntervalMsState(v), []);

  const value = useMemo<SettingsState>(
    () => ({ autoRefresh, setAutoRefresh, intervalMs, setIntervalMs }),
    [autoRefresh, setAutoRefresh, intervalMs, setIntervalMs]
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsState => useContext(SettingsContext);
