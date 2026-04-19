import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, fetchAlerts, resolveAlert } from "../api/alerts";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";

interface AlertsState {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  resolve: (id: string) => Promise<void>;
}

const DEFAULT_STATE: AlertsState = {
  alerts: [],
  loading: false,
  error: null,
  refresh: async () => undefined,
  resolve: async () => undefined,
};

const AlertsContext = createContext<AlertsState>(DEFAULT_STATE);

const POLL_INTERVAL_MS = 15000;

export const AlertsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef<boolean>(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchAlerts();
      if (!mountedRef.current) return;
      setAlerts(data);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Unable to load alerts");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const resolve = useCallback(
    async (id: string) => {
      await resolveAlert(id);
      if (!mountedRef.current) return;
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    },
    []
  );

  useEffect(() => {
    mountedRef.current = true;
    load();
    const timer = window.setInterval(load, POLL_INTERVAL_MS);
    const unsubscribe = subscribeRealtime(RealtimeEvents.AlertCreated, () => {
      load();
    });
    return () => {
      mountedRef.current = false;
      window.clearInterval(timer);
      unsubscribe();
    };
  }, [load]);

  const value = useMemo<AlertsState>(
    () => ({ alerts, loading, error, refresh: load, resolve }),
    [alerts, loading, error, load, resolve]
  );

  return (
    <AlertsContext.Provider value={value}>{children}</AlertsContext.Provider>
  );
};

export const useAlerts = (): AlertsState => useContext(AlertsContext);
