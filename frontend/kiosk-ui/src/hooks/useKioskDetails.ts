import { useCallback, useEffect, useRef, useState } from "react";
import {
  KioskAlert,
  KioskOverview,
  fetchKioskOverview,
  fetchKioskRecentAlerts,
} from "../api/kioskDetails";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";

const POLL_INTERVAL_MS = 10000;

export interface KioskDetailsState {
  overview: KioskOverview | null;
  alerts: KioskAlert[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useKioskDetails(machineName: string | null): KioskDetailsState {
  const [overview, setOverview] = useState<KioskOverview | null>(null);
  const [alerts, setAlerts] = useState<KioskAlert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const nameRef = useRef<string | null>(machineName);
  nameRef.current = machineName;

  const load = useCallback(async () => {
    const name = nameRef.current;
    if (!name) return;
    setError(null);
    try {
      const [ov, al] = await Promise.all([
        fetchKioskOverview(name),
        fetchKioskRecentAlerts(name),
      ]);
      if (nameRef.current !== name) return;
      setOverview(ov);
      setAlerts(al);
    } catch (err) {
      if (nameRef.current !== name) return;
      setError(err instanceof Error ? err.message : "Unable to load kiosk");
    } finally {
      if (nameRef.current === name) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!machineName) {
      setOverview(null);
      setAlerts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    load();
  }, [machineName, load]);

  useEffect(() => {
    if (!machineName) return;
    const id = window.setInterval(load, POLL_INTERVAL_MS);

    const reloadIfMatching = (payload: any) => {
      if (!payload || payload.machineName === machineName) load();
    };

    const unsubMachine = subscribeRealtime(
      RealtimeEvents.MachineUpdated,
      reloadIfMatching
    );
    const unsubAlert = subscribeRealtime(
      RealtimeEvents.AlertCreated,
      reloadIfMatching
    );
    const unsubCmd = subscribeRealtime(
      RealtimeEvents.CommandUpdated,
      reloadIfMatching
    );

    return () => {
      window.clearInterval(id);
      unsubMachine();
      unsubAlert();
      unsubCmd();
    };
  }, [machineName, load]);

  return { overview, alerts, loading, error, refresh: load };
}
