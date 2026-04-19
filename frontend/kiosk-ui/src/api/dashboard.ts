const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

export interface GlobalSummary {
  totalSites: number;
  totalDepartments: number;
  totalKiosks: number;
  onlineKiosks: number;
  offlineKiosks: number;
  activeAlerts: number;
  failedCommandsLast24h: number;
}

export interface SiteSummary {
  siteId: string;
  siteName: string;
  totalDepartments: number;
  totalKiosks: number;
  onlineKiosks: number;
  offlineKiosks: number;
  activeAlerts: number;
  failedCommandsLast24h: number;
}

export interface DepartmentSummary {
  departmentId: string;
  departmentName: string;
  siteId: string;
  totalKiosks: number;
  onlineKiosks: number;
  offlineKiosks: number;
  activeAlerts: number;
  failedCommandsLast24h: number;
}

export interface IssueAlert {
  id: string;
  machineName: string;
  type: string;
  message: string;
  createdAt: string;
}

export interface IssueCommand {
  id: string;
  machineName: string;
  type: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ProblematicKiosk {
  machineName: string;
  status: string;
  lastSeen: string;
  activeAlerts: number;
  reason: string;
}

export interface IssuesResponse {
  recentAlerts: IssueAlert[];
  failedCommands: IssueCommand[];
  problematicKiosks: ProblematicKiosk[];
}

const asNum = (v: any): number => (typeof v === "number" ? v : Number(v) || 0);
const asStr = (v: any): string => (typeof v === "string" ? v : String(v ?? ""));

const normalizeGlobal = (raw: any): GlobalSummary => ({
  totalSites: asNum(pick(raw, "totalSites", "TotalSites")),
  totalDepartments: asNum(pick(raw, "totalDepartments", "TotalDepartments")),
  totalKiosks: asNum(pick(raw, "totalKiosks", "TotalKiosks")),
  onlineKiosks: asNum(pick(raw, "onlineKiosks", "OnlineKiosks")),
  offlineKiosks: asNum(pick(raw, "offlineKiosks", "OfflineKiosks")),
  activeAlerts: asNum(pick(raw, "activeAlerts", "ActiveAlerts")),
  failedCommandsLast24h: asNum(
    pick(raw, "failedCommandsLast24h", "FailedCommandsLast24h")
  ),
});

const normalizeSite = (raw: any): SiteSummary => ({
  siteId: asStr(pick(raw, "siteId", "SiteId")),
  siteName: asStr(pick(raw, "siteName", "SiteName")),
  totalDepartments: asNum(pick(raw, "totalDepartments", "TotalDepartments")),
  totalKiosks: asNum(pick(raw, "totalKiosks", "TotalKiosks")),
  onlineKiosks: asNum(pick(raw, "onlineKiosks", "OnlineKiosks")),
  offlineKiosks: asNum(pick(raw, "offlineKiosks", "OfflineKiosks")),
  activeAlerts: asNum(pick(raw, "activeAlerts", "ActiveAlerts")),
  failedCommandsLast24h: asNum(
    pick(raw, "failedCommandsLast24h", "FailedCommandsLast24h")
  ),
});

const normalizeDept = (raw: any): DepartmentSummary => ({
  departmentId: asStr(pick(raw, "departmentId", "DepartmentId")),
  departmentName: asStr(pick(raw, "departmentName", "DepartmentName")),
  siteId: asStr(pick(raw, "siteId", "SiteId")),
  totalKiosks: asNum(pick(raw, "totalKiosks", "TotalKiosks")),
  onlineKiosks: asNum(pick(raw, "onlineKiosks", "OnlineKiosks")),
  offlineKiosks: asNum(pick(raw, "offlineKiosks", "OfflineKiosks")),
  activeAlerts: asNum(pick(raw, "activeAlerts", "ActiveAlerts")),
  failedCommandsLast24h: asNum(
    pick(raw, "failedCommandsLast24h", "FailedCommandsLast24h")
  ),
});

const normalizeIssueAlert = (raw: any): IssueAlert => ({
  id: asStr(pick(raw, "id", "Id")),
  machineName: asStr(pick(raw, "machineName", "MachineName")),
  type: asStr(pick(raw, "type", "Type")),
  message: asStr(pick(raw, "message", "Message")),
  createdAt: asStr(pick(raw, "createdAt", "CreatedAt")),
});

const normalizeIssueCommand = (raw: any): IssueCommand => ({
  id: asStr(pick(raw, "id", "Id")),
  machineName: asStr(pick(raw, "machineName", "MachineName")),
  type: asStr(pick(raw, "type", "Type")),
  createdAt: asStr(pick(raw, "createdAt", "CreatedAt")),
  completedAt: (pick<string>(raw, "completedAt", "CompletedAt") ?? null) as
    | string
    | null,
});

const normalizeProblematic = (raw: any): ProblematicKiosk => ({
  machineName: asStr(pick(raw, "machineName", "MachineName")),
  status: asStr(pick(raw, "status", "Status")),
  lastSeen: asStr(pick(raw, "lastSeen", "LastSeen")),
  activeAlerts: asNum(pick(raw, "activeAlerts", "ActiveAlerts")),
  reason: asStr(pick(raw, "reason", "Reason")),
});

const normalizeIssues = (raw: any): IssuesResponse => ({
  recentAlerts: Array.isArray(pick(raw, "recentAlerts", "RecentAlerts"))
    ? (pick<any[]>(raw, "recentAlerts", "RecentAlerts") as any[]).map(
        normalizeIssueAlert
      )
    : [],
  failedCommands: Array.isArray(pick(raw, "failedCommands", "FailedCommands"))
    ? (pick<any[]>(raw, "failedCommands", "FailedCommands") as any[]).map(
        normalizeIssueCommand
      )
    : [],
  problematicKiosks: Array.isArray(
    pick(raw, "problematicKiosks", "ProblematicKiosks")
  )
    ? (pick<any[]>(raw, "problematicKiosks", "ProblematicKiosks") as any[]).map(
        normalizeProblematic
      )
    : [],
});

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchGlobalSummary(): Promise<GlobalSummary> {
  return normalizeGlobal(await get<any>("/api/dashboard/summary"));
}

export async function fetchSiteSummary(siteId: string): Promise<SiteSummary> {
  return normalizeSite(
    await get<any>(`/api/sites/${encodeURIComponent(siteId)}/summary`)
  );
}

export async function fetchDepartmentSummary(
  departmentId: string
): Promise<DepartmentSummary> {
  return normalizeDept(
    await get<any>(
      `/api/departments/${encodeURIComponent(departmentId)}/summary`
    )
  );
}

export async function fetchSiteIssues(siteId: string): Promise<IssuesResponse> {
  return normalizeIssues(
    await get<any>(`/api/sites/${encodeURIComponent(siteId)}/issues`)
  );
}

export async function fetchDepartmentIssues(
  departmentId: string
): Promise<IssuesResponse> {
  return normalizeIssues(
    await get<any>(
      `/api/departments/${encodeURIComponent(departmentId)}/issues`
    )
  );
}
