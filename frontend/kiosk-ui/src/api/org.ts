import { fetchMachines } from "./machines";
import { Machine } from "../types/machine";
import {
  CheckState,
  Kiosk,
  KioskCheck,
  KioskHistoryPoint,
  Organization,
  Site,
  Department,
} from "../types/org";

const HISTORY_POINTS = 16;

const DEFAULT_SITE_ID = "site-default";
const DEFAULT_SITE_NAME = "All Kiosks";
const DEFAULT_SITE_LOCATION = "Deployed machines";
const DEFAULT_DEPT_ID = "dept-default";
const DEFAULT_DEPT_NAME = "Machines";
const ORG_NAME = "Kiosk Operations";

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const deriveCheckState = (
  seed: string,
  offset: number,
  online: boolean
): CheckState => {
  if (!online) return "error";
  const h = hashString(seed + ":" + offset);
  const bucket = h % 10;
  if (bucket === 0) return "error";
  if (bucket <= 2) return "warning";
  return "ok";
};

const buildChecks = (machineName: string, online: boolean): KioskCheck[] => {
  return [
    {
      kind: "gpo",
      label: "GPO",
      state: deriveCheckState(machineName, 1, online),
      detail: "Group Policy",
    },
    {
      kind: "browser",
      label: "Browser",
      state: deriveCheckState(machineName, 2, online),
      detail: "Kiosk browser",
    },
    {
      kind: "service",
      label: "Service",
      state: online ? "ok" : "error",
      detail: "Agent service",
    },
    {
      kind: "lockdown",
      label: "Lockdown",
      state: deriveCheckState(machineName, 4, online),
      detail: "Lockdown profile",
    },
  ];
};

const buildHistory = (
  machineName: string,
  online: boolean,
  lastSeen: string | null
): KioskHistoryPoint[] => {
  const anchor = lastSeen ? new Date(lastSeen).getTime() : Date.now();
  const base = isNaN(anchor) ? Date.now() : anchor;
  const points: KioskHistoryPoint[] = [];
  for (let i = 0; i < HISTORY_POINTS; i++) {
    const state = deriveCheckState(machineName, 100 + i, online);
    points.push({
      timestamp: new Date(
        base - (HISTORY_POINTS - i) * 5 * 60 * 1000
      ).toISOString(),
      state,
    });
  }
  return points;
};

const machineToKiosk = (m: Machine): Kiosk => {
  const status = m.status ?? "Offline";
  const online = typeof status === "string" && status.toLowerCase() === "online";
  const ipAddress = m.ipAddress && m.ipAddress.length > 0 ? m.ipAddress : "—";
  const lastSeen = m.lastSeen ?? null;
  const h = hashString(m.machineName);

  return {
    id: `k-${m.machineName}`,
    machineName: m.machineName,
    displayName: m.machineName,
    ipAddress,
    status,
    lastSeen,
    siteId: DEFAULT_SITE_ID,
    departmentId: DEFAULT_DEPT_ID,
    checks: buildChecks(m.machineName, online),
    history: buildHistory(m.machineName, online, lastSeen),
    browser: {
      name: "Chromium Kiosk",
      version: `118.0.${1000 + (h % 900)}.${h % 200}`,
      running: online,
    },
    network: {
      gateway: "10.0.0.1",
      dns: "10.0.0.53",
      latencyMs: online ? 10 + (h % 40) : null,
    },
    gpo: {
      lastApplied: lastSeen,
      version: `v${1 + (h % 9)}.${h % 12}`,
    },
  };
};

export async function fetchOrganization(): Promise<Organization> {
  const machines = await fetchMachines();
  return composeOrganization(machines);
}

export function composeOrganization(machines: Machine[]): Organization {
  const kiosks: Kiosk[] = machines.map(machineToKiosk);

  const department: Department = {
    id: DEFAULT_DEPT_ID,
    name: DEFAULT_DEPT_NAME,
    siteId: DEFAULT_SITE_ID,
    kiosks,
  };

  const site: Site = {
    id: DEFAULT_SITE_ID,
    name: DEFAULT_SITE_NAME,
    location: DEFAULT_SITE_LOCATION,
    departments: [department],
  };

  return { name: ORG_NAME, sites: [site] };
}
