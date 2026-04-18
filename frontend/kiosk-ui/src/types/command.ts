export type CommandType =
  | "refresh_cache"
  | "restart_service"
  | "restart_browser"
  | "gpupdate"
  | "reboot"
  | string;

export type CommandStatus = "Pending" | "Completed" | "Failed" | string;

export interface KioskCommand {
  id: string;
  machineName: string;
  type: CommandType;
  payload: string | null;
  status: CommandStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface CreateCommandRequest {
  machineName: string;
  type: CommandType;
  payload: string;
}
