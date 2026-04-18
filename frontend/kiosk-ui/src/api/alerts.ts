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

export async function fetchAlerts(): Promise<Alert[]> {
  const response = await fetch(`${API_BASE_URL}/api/alerts`, {
    credentials: "include",
  });
  if (response.status === 401 || response.status === 403) {
    return [];
  }
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? (data as Alert[]) : [];
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
