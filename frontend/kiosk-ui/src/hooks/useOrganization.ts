import { useCallback, useEffect, useRef, useState } from "react";
import { fetchOrganization } from "../api/org";
import { Organization } from "../types/org";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";
import { usePolling } from "./usePolling";
import { useSettings } from "../context/SettingsContext";

export interface OrgState {
  org: Organization | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useOrganization(): OrgState {
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { autoRefresh, intervalMs } = useSettings();

  const load = useCallback(async () => {
    try {
      const data = await fetchOrganization();
      setOrg(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load organization"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // When auto-refresh is off, polling never fires — do a one-shot load on mount
  const seedLoaded = useRef(false);
  useEffect(() => {
    if (!seedLoaded.current && !autoRefresh) {
      seedLoaded.current = true;
      void load();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  usePolling(load, { intervalMs, enabled: autoRefresh, immediate: true });

  useEffect(() => {
    const unsubscribe = subscribeRealtime(
      RealtimeEvents.MachineUpdated,
      () => {
        load();
      }
    );
    return () => {
      unsubscribe();
    };
  }, [load]);

  return { org, loading, error, refresh: load };
}
