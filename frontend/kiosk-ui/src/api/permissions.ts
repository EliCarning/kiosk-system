export interface UserPermissions {
  username: string;
  roles: string[];
  canReboot: boolean;
  canOperate: boolean;
  canView: boolean;
}

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5226";

export async function fetchPermissions(): Promise<UserPermissions> {
  const response = await fetch(`${API_BASE_URL}/api/me/permissions`, {
    credentials: "include",
  });
  if (response.status === 401 || response.status === 403) {
    return {
      username: "",
      roles: [],
      canReboot: false,
      canOperate: false,
      canView: false,
    };
  }
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const data = await response.json();
  return {
    username: data.username ?? "",
    roles: Array.isArray(data.roles) ? data.roles : [],
    canReboot: Boolean(data.canReboot),
    canOperate: Boolean(data.canOperate),
    canView: Boolean(data.canView),
  };
}
