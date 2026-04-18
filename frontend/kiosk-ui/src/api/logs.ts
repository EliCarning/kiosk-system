import { MachineLog } from "../types/log";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

export async function fetchMachineLogs(
  machineName: string
): Promise<MachineLog[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/machines/${encodeURIComponent(machineName)}/logs`
  );
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}
