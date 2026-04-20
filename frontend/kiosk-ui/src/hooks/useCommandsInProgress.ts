import { useCallback, useEffect, useState } from "react";
import { fetchRecentCommands } from "../api/commands";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";
import { usePolling } from "./usePolling";

const POLL_MS = 10000;
const LIMIT = 200;

const inProgress = (status: string): boolean => {
  const s = status.toLowerCase();
  return s === "pending" || s === "running";
};

export function useCommandsInProgress(): number {
  const [count, setCount] = useState<number>(0);

  const load = useCallback(async () => {
    try {
      const data = await fetchRecentCommands({ limit: LIMIT });
      setCount(data.filter((c) => inProgress(c.status)).length);
    } catch {
      // soft-fail — KPI just won't update
    }
  }, []);

  usePolling(load, { intervalMs: POLL_MS });

  useEffect(() => {
    const unsub = subscribeRealtime(RealtimeEvents.CommandUpdated, () => {
      load();
    });
    return () => unsub();
  }, [load]);

  return count;
}
