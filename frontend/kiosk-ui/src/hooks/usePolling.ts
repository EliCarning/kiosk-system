import { useEffect, useRef } from "react";

interface UsePollingOptions {
  intervalMs: number;
  immediate?: boolean;
  enabled?: boolean;
}

export function usePolling(
  callback: () => void | Promise<void>,
  { intervalMs, immediate = true, enabled = true }: UsePollingOptions
): void {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let timer: number | null = null;
    let inflight = false;

    const tick = async () => {
      if (cancelled || inflight) return;
      inflight = true;
      try {
        await callbackRef.current();
      } catch {
        /* swallow — caller handles its own errors */
      } finally {
        inflight = false;
      }
    };

    if (immediate) {
      void tick();
    }
    timer = window.setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
    };
  }, [intervalMs, immediate, enabled]);
}
