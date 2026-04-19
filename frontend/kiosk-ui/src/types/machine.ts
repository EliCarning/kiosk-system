export type MachineStatus = "Online" | "Offline" | "Warning" | string;

export interface Machine {
  machineName: string;
  ipAddress: string;
  lastSeen: string;
  status: MachineStatus;
  siteId?: string | null;
  departmentId?: string | null;
}
