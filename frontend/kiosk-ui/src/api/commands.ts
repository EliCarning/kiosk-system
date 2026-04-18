import { KioskCommand } from "../types/command";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

export async function fetchCommands(
  machineName: string
): Promise<KioskCommand[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/commands/${encodeURIComponent(machineName)}`
  );
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return (data as any[]).map(normalizeCommand);
}

function normalizeCommand(raw: any): KioskCommand {
  const statusRaw = raw.status;
  let status: KioskCommand["status"];
  if (typeof statusRaw === "number") {
    status = ["Pending", "Completed", "Failed"][statusRaw] ?? "Pending";
  } else {
    status = String(statusRaw ?? "Pending");
  }
  return {
    id: String(raw.id),
    machineName: raw.machineName ?? "",
    type: raw.type ?? "",
    payload: raw.payload ?? null,
    status,
    createdAt: raw.createdAt,
    completedAt: raw.completedAt ?? null,
  };
}
