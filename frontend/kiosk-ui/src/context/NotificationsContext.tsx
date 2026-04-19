import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";

export type NotificationVariant = "info" | "success" | "warning" | "error";

export interface Notification {
  id: string;
  variant: NotificationVariant;
  title: string;
  message: string;
  machineName?: string;
  createdAt: number;
}

interface NotificationsState {
  notifications: Notification[];
  dismiss: (id: string) => void;
}

const DEFAULT_STATE: NotificationsState = {
  notifications: [],
  dismiss: () => undefined,
};

const NotificationsContext = createContext<NotificationsState>(DEFAULT_STATE);

const AUTO_DISMISS_MS = 5000;
const DEDUPE_WINDOW_MS = 3000;

let notificationCounter = 0;
const nextId = () => `${Date.now()}-${++notificationCounter}`;

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());
  const recentKeysRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (dedupeKey: string, data: Omit<Notification, "id" | "createdAt">) => {
      const now = Date.now();
      const last = recentKeysRef.current.get(dedupeKey);
      if (last && now - last < DEDUPE_WINDOW_MS) return;
      recentKeysRef.current.set(dedupeKey, now);

      const notification: Notification = {
        id: nextId(),
        createdAt: now,
        ...data,
      };

      setNotifications((prev) => [notification, ...prev].slice(0, 6));

      const timer = window.setTimeout(() => {
        dismiss(notification.id);
      }, AUTO_DISMISS_MS);
      timersRef.current.set(notification.id, timer);
    },
    [dismiss]
  );

  useEffect(() => {
    const unsubAlert = subscribeRealtime<{
      id?: string;
      machineName?: string;
      type?: string;
      message?: string;
    }>(RealtimeEvents.AlertCreated, (payload) => {
      if (!payload) return;
      const machine = payload.machineName ?? "unknown";
      const type = payload.type ?? "Alert";
      const isOffline = type.toLowerCase() === "offline";
      push(`alert:${payload.id ?? machine + ":" + type}`, {
        variant: isOffline ? "warning" : "error",
        title: isOffline ? "Machine offline" : `New alert · ${type}`,
        message: payload.message || `${machine} raised a ${type} alert`,
        machineName: payload.machineName,
      });
    });

    const unsubCommand = subscribeRealtime<{
      id?: string;
      machineName?: string;
      type?: string;
      status?: string;
    }>(RealtimeEvents.CommandUpdated, (payload) => {
      if (!payload) return;
      const status = (payload.status ?? "").toLowerCase();
      if (status !== "completed" && status !== "failed") return;
      const machine = payload.machineName ?? "unknown";
      const cmdType = payload.type ?? "command";
      push(`cmd:${payload.id ?? machine}:${status}`, {
        variant: status === "failed" ? "error" : "success",
        title: status === "failed" ? "Command failed" : "Command completed",
        message: `${cmdType} on ${machine}`,
        machineName: payload.machineName,
      });
    });

    return () => {
      unsubAlert();
      unsubCommand();
    };
  }, [push]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
    };
  }, []);

  const value = useMemo<NotificationsState>(
    () => ({ notifications, dismiss }),
    [notifications, dismiss]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = (): NotificationsState =>
  useContext(NotificationsContext);
