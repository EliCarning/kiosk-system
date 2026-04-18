import { Machine, MachineStatus } from "./machine";

export type CheckState = "ok" | "warning" | "error" | "unknown";

export type CheckKind = "gpo" | "browser" | "service" | "lockdown";

export interface KioskCheck {
  kind: CheckKind;
  label: string;
  state: CheckState;
  detail?: string;
}

export interface KioskHistoryPoint {
  timestamp: string;
  state: CheckState;
}

export interface Kiosk {
  id: string;
  machineName: string;
  displayName: string;
  ipAddress: string;
  status: MachineStatus;
  lastSeen: string | null;
  siteId: string;
  departmentId: string;
  checks: KioskCheck[];
  history: KioskHistoryPoint[];
  browser: {
    name: string;
    version: string;
    running: boolean;
  };
  network: {
    gateway: string;
    dns: string;
    latencyMs: number | null;
  };
  gpo: {
    lastApplied: string | null;
    version: string;
  };
}

export interface Department {
  id: string;
  name: string;
  siteId: string;
  kiosks: Kiosk[];
}

export interface Site {
  id: string;
  name: string;
  location: string;
  departments: Department[];
}

export interface Organization {
  name: string;
  sites: Site[];
}

export interface OrgSummary {
  totalKiosks: number;
  online: number;
  offline: number;
  warnings: number;
  sites: number;
}

export interface KioskComposition {
  machine: Machine | null;
  kiosk: Kiosk;
}
