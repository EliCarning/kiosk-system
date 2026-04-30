import { KioskCommand } from "../types/command";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

const pick = <T,>(obj: any, ...keys: string[]): T | undefined => {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
};

function normalizeCommand(raw: any): KioskCommand {
  const statusRaw = pick<any>(raw, "status", "Status");
  let status: KioskCommand["status"];
  if (typeof statusRaw === "number") {
    status = ["Pending", "Completed", "Failed"][statusRaw] ?? "Pending";
  } else {
    status = String(statusRaw ?? "Pending");
  }
  return {
    id: String(pick<string>(raw, "id", "Id") ?? ""),
    machineName: pick<string>(raw, "machineName", "MachineName") ?? "",
    type: pick<string>(raw, "type", "Type") ?? "",
    payload: pick<string>(raw, "payload", "Payload") ?? null,
    status,
    createdAt: pick<string>(raw, "createdAt", "CreatedAt") ?? "",
    completedAt: pick<string>(raw, "completedAt", "CompletedAt") ?? null,
    issuedByUsername: pick<string>(raw, "issuedByUsername", "IssuedByUsername") ?? null,
    issuedByDisplayName: pick<string>(raw, "issuedByDisplayName", "IssuedByDisplayName") ?? null,
    issuedFromIp: pick<string>(raw, "issuedFromIp", "IssuedFromIp") ?? null,
  };
}

export async function fetchCommands(
  machineName: string
): Promise<KioskCommand[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/commands/${encodeURIComponent(machineName)}`,
    { credentials: "include" }
  );
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeCommand) : [];
}

export async function fetchRecentCommands(params?: {
  status?: string;
  limit?: number;
}): Promise<KioskCommand[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const response = await fetch(`${API_BASE_URL}/api/commands${suffix}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data.map(normalizeCommand) : [];
}
