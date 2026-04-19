import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, fetchAlertHistory, fetchAlerts } from "../api/alerts";
import { fetchRecentCommands } from "../api/commands";
import { KioskCommand } from "../types/command";
import StateView from "../components/StateView";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";

const POLL_MS = 15000;

type EventKind = "alert" | "command" | "machine";

interface ActivityEvent {
  id: string;
  kind: EventKind;
  timestamp: string;
  machineName: string;
  title: string;
  detail: string;
  tone: "ok" | "warn" | "err" | "info";
}

type Filter = "all" | EventKind;
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "alert", label: "Alerts" },
  { key: "command", label: "Commands" },
  { key: "machine", label: "Machines" },
];

const alertToEvent = (a: Alert): ActivityEvent => ({
  id: `alert:${a.id}`,
  kind: "alert",
  timestamp: a.createdAt,
  machineName: a.machineName,
  title: a.isResolved ? `Alert resolved · ${a.type}` : `Alert raised · ${a.type}`,
  detail: a.message,
  tone: a.isResolved ? "ok" : "warn",
});

const commandToEvent = (c: KioskCommand): ActivityEvent => {
  const s = c.status.toLowerCase();
  const tone: ActivityEvent["tone"] =
    s === "completed" ? "ok" : s === "failed" ? "err" : "info";
  const when = c.completedAt || c.createdAt;
  return {
    id: `cmd:${c.id}`,
    kind: "command",
    timestamp: when,
    machineName: c.machineName,
    title: `Command ${c.status.toLowerCase()} · ${c.type}`,
    detail: c.payload ? String(c.payload) : "—",
    tone,
  };
};

const formatTime = (iso: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const toneClass = (tone: ActivityEvent["tone"]): string => {
  if (tone === "ok") return "activity-dot activity-dot--ok";
  if (tone === "err") return "activity-dot activity-dot--err";
  if (tone === "warn") return "activity-dot activity-dot--warn";
  return "activity-dot activity-dot--info";
};

const ActivityPage: React.FC = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [history, setHistory] = useState<Alert[]>([]);
  const [commands, setCommands] = useState<KioskCommand[]>([]);
  const [liveEvents, setLiveEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      const [a, h, c] = await Promise.all([
        fetchAlerts(),
        fetchAlertHistory(),
        fetchRecentCommands({ limit: 200 }),
      ]);
      setAlerts(a);
      setHistory(h);
      setCommands(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(load, POLL_MS);

    const unsubMachine = subscribeRealtime<any>(
      RealtimeEvents.MachineUpdated,
      (payload) => {
        if (!payload) return;
        const name =
          payload.machineName || payload.MachineName || "(unknown)";
        const status =
          payload.status || payload.Status || payload.state || "updated";
        const event: ActivityEvent = {
          id: `machine:${name}:${Date.now()}`,
          kind: "machine",
          timestamp: new Date().toISOString(),
          machineName: name,
          title: `Machine ${String(status).toLowerCase()}`,
          detail: `${name} reported ${String(status).toLowerCase()}`,
          tone:
            String(status).toLowerCase() === "online"
              ? "ok"
              : String(status).toLowerCase() === "offline"
              ? "err"
              : "info",
        };
        setLiveEvents((prev) => [event, ...prev].slice(0, 50));
      }
    );

    const unsubAlert = subscribeRealtime(RealtimeEvents.AlertCreated, () =>
      load()
    );
    const unsubCmd = subscribeRealtime(RealtimeEvents.CommandUpdated, () =>
      load()
    );
    return () => {
      window.clearInterval(id);
      unsubMachine();
      unsubAlert();
      unsubCmd();
    };
  }, [load]);

  const events = useMemo<ActivityEvent[]>(() => {
    const merged: ActivityEvent[] = [
      ...liveEvents,
      ...alerts.map(alertToEvent),
      ...history.map(alertToEvent),
      ...commands.map(commandToEvent),
    ];
    const dedup = new Map<string, ActivityEvent>();
    merged.forEach((e) => {
      if (!dedup.has(e.id)) dedup.set(e.id, e);
    });
    const out = Array.from(dedup.values());
    out.sort((a, b) => {
      const ta = new Date(a.timestamp).getTime() || 0;
      const tb = new Date(b.timestamp).getTime() || 0;
      return tb - ta;
    });
    return out;
  }, [liveEvents, alerts, history, commands]);

  const filtered = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.kind === filter)),
    [events, filter]
  );

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Activity</h1>
          <div className="page__subtitle">
            Unified stream of alerts, commands, and machine events
          </div>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={load} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <div className="page__filters">
        <div className="chips">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`chip${filter === f.key ? " is-active" : ""}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <section className="page__body">
        {loading && events.length === 0 ? (
          <StateView
            variant="loading"
            title="Loading activity"
            message="Fetching recent events..."
          />
        ) : error ? (
          <StateView
            variant="error"
            title="Unable to load activity"
            message={error}
            onRetry={load}
          />
        ) : filtered.length === 0 ? (
          <StateView
            variant="empty"
            title="No recent activity"
            message="Events will appear here as alerts are raised and commands run."
          />
        ) : (
          <ul className="activity-feed">
            {filtered.map((e) => (
              <li key={e.id} className="activity-item">
                <span className={toneClass(e.tone)} />
                <div className="activity-item__body">
                  <div className="activity-item__title">{e.title}</div>
                  <div className="activity-item__meta">
                    <button
                      className="linklike"
                      onClick={() =>
                        navigate(
                          `/kiosks/${encodeURIComponent(e.machineName)}`
                        )
                      }
                    >
                      {e.machineName}
                    </button>
                    <span className="activity-item__dot">·</span>
                    <span>{formatTime(e.timestamp)}</span>
                  </div>
                  {e.detail && (
                    <div className="activity-item__detail">{e.detail}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default ActivityPage;
