import { useCallback, useEffect, useState } from "react";
import { fetchOrganization } from "../api/org";
import { Organization } from "../types/org";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";

const POLL_INTERVAL_MS = 5000;

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
    setError(null);
    try {
      const data = await fetchOrganization();
      setOrg(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load organization");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = window.setInterval(load, POLL_INTERVAL_MS);
    const unsubscribe = subscribeRealtime(
      RealtimeEvents.MachineUpdated,
      () => {
        load();
      }
    );
    return () => {
      window.clearInterval(id);
      unsubscribe();
    };
  }, [load]);

  return { org, loading, error, refresh: load };
}
