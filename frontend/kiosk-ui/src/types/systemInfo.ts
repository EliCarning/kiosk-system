export interface SystemInfo {
  id: string;
  machineName: string;
  hostname: string;
  osVersion: string;
  ipAddress: string | null;
  uptime: string | null;
  currentUser: string | null;
  cpuCores: number | null;
  totalRamMb: number | null;
  freeRamMb: number | null;
  diskSummary: string | null;
  lastBoot: string | null;
  collectedAt: string;
}

export interface EventLogEntry {
  id: string;
  machineName: string;
  logName: string;
  source: string;
  eventId: number;
  level: string;
  message: string;
  timestamp: string;
  collectedAt: string;
}

export interface EventLogFilter {
  logName: string;
  level: string;
  hoursBack: number;
  maxResults: number;
}
