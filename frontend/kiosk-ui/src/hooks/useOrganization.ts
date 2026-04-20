import { useCallback, useEffect, useState } from "react";
import { fetchOrganization } from "../api/org";
import { Organization } from "../types/org";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";
import { usePolling } from "./usePolling";

const POLL_INTERVAL_MS = 8000;

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

  usePolling(load, { intervalMs: POLL_INTERVAL_MS });

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
