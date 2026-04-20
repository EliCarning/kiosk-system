import { CommandType, CreateCommandRequest, KioskCommand } from "../types/command";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

export async function createCommand(
  machineName: string,
  type: CommandType,
  payload: string = ""
): Promise<KioskCommand> {
  const body: CreateCommandRequest = { machineName, type, payload };
  const response = await fetch(`${API_BASE_URL}/api/commands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Command failed (${response.status})${text ? `: ${text}` : ""}`
    );
  }

  return response.json();
}
