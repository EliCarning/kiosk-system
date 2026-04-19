import { Machine } from "../types/machine";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

const normalize = (raw: any): Machine => ({
  machineName: pick<string>(raw, "machineName", "MachineName") ?? "",
  ipAddress: pick<string>(raw, "ipAddress", "IpAddress") ?? "",
  lastSeen: pick<string>(raw, "lastSeen", "LastSeen") ?? "",
  status: pick<string>(raw, "status", "Status") ?? "Offline",
  siteId: pick<string>(raw, "siteId", "SiteId") ?? null,
  departmentId: pick<string>(raw, "departmentId", "DepartmentId") ?? null,
});

export async function fetchMachines(): Promise<Machine[]> {
  const response = await fetch(`${API_BASE_URL}/api/machines`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(normalize) : [];
}
