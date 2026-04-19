export interface Alert {
  id: string;
  machineName: string;
  type: string;
  message: string;
  createdAt: string;
  isResolved: boolean;
  resolvedAt: string | null;
}

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const key of keys) {
    if (obj && obj[key] !== undefined && obj[key] !== null) {
      return obj[key] as T;
    }
  }
  return undefined;
};

const normalizeAlert = (raw: any): Alert => ({
  id: pick<string>(raw, "id", "Id") ?? "",
  machineName: pick<string>(raw, "machineName", "MachineName") ?? "",
  type: pick<string>(raw, "type", "Type") ?? "",
  message: pick<string>(raw, "message", "Message") ?? "",
  createdAt: pick<string>(raw, "createdAt", "CreatedAt") ?? "",
  isResolved: Boolean(pick<boolean>(raw, "isResolved", "IsResolved") ?? false),
  resolvedAt: pick<string>(raw, "resolvedAt", "ResolvedAt") ?? null,
});

async function fetchAlertList(path: string): Promise<Alert[]> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
  });
  if (response.status === 401 || response.status === 403) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  if (!Array.isArray(data)) return [];
  return data.map(normalizeAlert).filter((a) => a.id);
}

export async function fetchAlerts(): Promise<Alert[]> {
  const alerts = await fetchAlertList("/api/alerts");
  return alerts.filter((a) => !a.isResolved);
}

export async function fetchAlertHistory(): Promise<Alert[]> {
  return fetchAlertList("/api/alerts/history");
}

export async function resolveAlert(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/alerts/${id}/resolve`, {
    method: "POST",
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
}
