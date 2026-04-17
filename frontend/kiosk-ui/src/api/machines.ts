import { Machine } from "../types/machine";

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

export async function fetchMachines(): Promise<Machine[]> {
  const response = await fetch(`${API_BASE_URL}/api/machines`);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json();
}
