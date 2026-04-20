import { useCallback, useEffect, useState } from "react";
import { fetchRecentCommands } from "../api/commands";
import { KioskCommand } from "../types/command";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";
import { usePolling } from "./usePolling";

const POLL_MS = 10000;
const LIMIT = 50;

export interface UseRecentCommandsResult {
  commands: KioskCommand[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useRecentCommands(): UseRecentCommandsResult {
  const [commands, setCommands] = useState<KioskCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchRecentCommands({ limit: LIMIT });
      setCommands(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load commands");
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(load, { intervalMs: POLL_MS });

  useEffect(() => {
    const unsub = subscribeRealtime(RealtimeEvents.CommandUpdated, () => {
      void load();
    });
    return () => unsub();
  }, [load]);

  return { commands, loading, error, refresh: load };
}
