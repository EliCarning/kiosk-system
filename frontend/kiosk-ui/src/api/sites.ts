const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

export interface SiteDto {
  id: string;
  name: string;
}

export interface DepartmentDto {
  id: string;
  name: string;
  siteId: string;
}

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

const normalizeSite = (raw: any): SiteDto => ({
  id: pick<string>(raw, "id", "Id") ?? "",
  name: pick<string>(raw, "name", "Name") ?? "",
});

const normalizeDept = (raw: any): DepartmentDto => ({
  id: pick<string>(raw, "id", "Id") ?? "",
  name: pick<string>(raw, "name", "Name") ?? "",
  siteId: pick<string>(raw, "siteId", "SiteId") ?? "",
});

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json() as Promise<T>;
}

export async function fetchSites(): Promise<SiteDto[]> {
  const raw = await get<any[]>("/api/sites");
  return Array.isArray(raw) ? raw.map(normalizeSite) : [];
}

export async function fetchDepartmentsBySite(
  siteId: string
): Promise<DepartmentDto[]> {
  const raw = await get<any[]>(
    `/api/sites/${encodeURIComponent(siteId)}/departments`
  );
  return Array.isArray(raw) ? raw.map(normalizeDept) : [];
}

export async function assignKiosk(
  machineName: string,
  body: { siteId: string | null; departmentId: string | null }
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/kiosks/${encodeURIComponent(machineName)}/assign`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
}
