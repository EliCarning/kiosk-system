const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

const asNum = (v: any): number => (typeof v === "number" ? v : Number(v) || 0);
const asStr = (v: any): string => (typeof v === "string" ? v : String(v ?? ""));

export interface KioskOverview {
  machineName: string;
  ipAddress: string;
  status: string;
  lastSeen: string;
  siteId: string | null;
  siteName: string | null;
  departmentId: string | null;
  departmentName: string | null;
  activeAlertsCount: number;
  failedCommandsLast24h: number;
  logsCountLast24h: number;
}

export interface KioskAlert {
  id: string;
  machineName: string;
  type: string;
  message: string;
  createdAt: string;
}

const normalizeOverview = (raw: any): KioskOverview => ({
  machineName: asStr(pick(raw, "machineName", "MachineName")),
  ipAddress: asStr(pick(raw, "ipAddress", "IpAddress")),
  status: asStr(pick(raw, "status", "Status")),
  lastSeen: asStr(pick(raw, "lastSeen", "LastSeen")),
  siteId: (pick<string>(raw, "siteId", "SiteId") ?? null) as string | null,
  siteName: (pick<string>(raw, "siteName", "SiteName") ?? null) as string | null,
  departmentId: (pick<string>(raw, "departmentId", "DepartmentId") ??
    null) as string | null,
  departmentName: (pick<string>(raw, "departmentName", "DepartmentName") ??
    null) as string | null,
  activeAlertsCount: asNum(pick(raw, "activeAlertsCount", "ActiveAlertsCount")),
  failedCommandsLast24h: asNum(
    pick(raw, "failedCommandsLast24h", "FailedCommandsLast24h")
  ),
  logsCountLast24h: asNum(pick(raw, "logsCountLast24h", "LogsCountLast24h")),
});

const normalizeAlert = (raw: any): KioskAlert => ({
  id: asStr(pick(raw, "id", "Id")),
  machineName: asStr(pick(raw, "machineName", "MachineName")),
  type: asStr(pick(raw, "type", "Type")),
  message: asStr(pick(raw, "message", "Message")),
  createdAt: asStr(pick(raw, "createdAt", "CreatedAt")),
});

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchKioskOverview(
  machineName: string
): Promise<KioskOverview> {
  return normalizeOverview(
    await get<any>(
      `/api/kiosks/${encodeURIComponent(machineName)}/overview`
    )
  );
}

export async function fetchKioskRecentAlerts(
  machineName: string
): Promise<KioskAlert[]> {
  const raw = await get<any[]>(
    `/api/kiosks/${encodeURIComponent(machineName)}/recent-alerts`
  );
  return Array.isArray(raw) ? raw.map(normalizeAlert).filter((a) => a.id) : [];
}
