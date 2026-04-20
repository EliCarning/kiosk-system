import { SystemInfo, EventLogEntry } from "../types/systemInfo";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json() as Promise<T>;
}

const norm = (raw: any): SystemInfo => ({
  id: raw.id ?? raw.Id ?? "",
  machineName: raw.machineName ?? raw.MachineName ?? "",
  hostname: raw.hostname ?? raw.Hostname ?? "",
  osVersion: raw.osVersion ?? raw.OsVersion ?? "",
  ipAddress: raw.ipAddress ?? raw.IpAddress ?? null,
  uptime: raw.uptime ?? raw.Uptime ?? null,
  currentUser: raw.currentUser ?? raw.CurrentUser ?? null,
  cpuCores: raw.cpuCores ?? raw.CpuCores ?? null,
  totalRamMb: raw.totalRamMb ?? raw.TotalRamMb ?? null,
  freeRamMb: raw.freeRamMb ?? raw.FreeRamMb ?? null,
  diskSummary: raw.diskSummary ?? raw.DiskSummary ?? null,
  lastBoot: raw.lastBoot ?? raw.LastBoot ?? null,
  collectedAt: raw.collectedAt ?? raw.CollectedAt ?? "",
});

const normEntry = (raw: any): EventLogEntry => ({
  id: raw.id ?? raw.Id ?? "",
  machineName: raw.machineName ?? raw.MachineName ?? "",
  logName: raw.logName ?? raw.LogName ?? "",
  source: raw.source ?? raw.Source ?? "",
  eventId: raw.eventId ?? raw.EventId ?? 0,
  level: raw.level ?? raw.Level ?? "",
  message: raw.message ?? raw.Message ?? "",
  timestamp: raw.timestamp ?? raw.Timestamp ?? "",
  collectedAt: raw.collectedAt ?? raw.CollectedAt ?? "",
});

export async function fetchSystemInfoLatest(
  machineName: string
): Promise<SystemInfo | null> {
  try {
    const raw = await get<any>(
      `/api/kiosks/${encodeURIComponent(machineName)}/system-info/latest`
    );
    return norm(raw);
  } catch (err: any) {
    if (err?.message?.includes("404")) return null;
    throw err;
  }
}

export async function fetchEventLogs(
  machineName: string,
  limit = 50
): Promise<EventLogEntry[]> {
  const raw = await get<any[]>(
    `/api/kiosks/${encodeURIComponent(machineName)}/event-logs?limit=${limit}`
  );
  return Array.isArray(raw) ? raw.map(normEntry) : [];
}
