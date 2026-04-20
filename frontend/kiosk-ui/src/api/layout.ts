import type { DashboardState } from "../dashboard/types";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

export async function fetchDashboardLayout(): Promise<DashboardState | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/dashboard/layout`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.layout) return null;
    const parsed = JSON.parse(data.layout) as DashboardState;
    if (!parsed?.layouts?.length || !parsed?.types) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveDashboardLayout(
  state: DashboardState
): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/api/dashboard/layout`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout: JSON.stringify(state) }),
    });
  } catch {
    // best-effort
  }
}
