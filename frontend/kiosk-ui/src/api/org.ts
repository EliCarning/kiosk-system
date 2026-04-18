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
import {
  MOCK_ORG,
  MockKioskSeed,
  UNASSIGNED_DEPT_ID,
  UNASSIGNED_SITE_ID,
} from "../data/mockOrg";

const HISTORY_POINTS = 16;

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const deriveCheckState = (seed: string, offset: number, online: boolean): CheckState => {
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
  const points: KioskHistoryPoint[] = [];
  for (let i = 0; i < HISTORY_POINTS; i++) {
    const state = deriveCheckState(machineName, 100 + i, online);
    points.push({
      timestamp: new Date(anchor - (HISTORY_POINTS - i) * 5 * 60 * 1000).toISOString(),
      state,
    });
  }
  return points;
};

const buildKiosk = (
  seed: MockKioskSeed,
  siteId: string,
  departmentId: string,
  machine: Machine | undefined
): Kiosk => {
  const online = machine?.status?.toLowerCase() === "online";
  const status = machine?.status ?? "Offline";
  const ipAddress = machine?.ipAddress ?? "—";
  const lastSeen = machine?.lastSeen ?? null;
  const checks = buildChecks(seed.machineName, online);
  const history = buildHistory(seed.machineName, online, lastSeen);
  const h = hashString(seed.machineName);

  return {
    id: seed.id,
    machineName: seed.machineName,
    displayName: seed.displayName,
    ipAddress,
    status,
    lastSeen,
    siteId,
    departmentId,
    checks,
    history,
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
  const byName = new Map<string, Machine>();
  for (const m of machines) byName.set(m.machineName, m);

  const claimed = new Set<string>();
  const sites: Site[] = MOCK_ORG.sites.map((mockSite) => {
    const departments: Department[] = mockSite.departments.map((mockDept) => {
      const kiosks = mockDept.kiosks.map((seed) => {
        claimed.add(seed.machineName);
        return buildKiosk(seed, mockSite.id, mockDept.id, byName.get(seed.machineName));
      });
      return {
        id: mockDept.id,
        name: mockDept.name,
        siteId: mockSite.id,
        kiosks,
      };
    });
    return {
      id: mockSite.id,
      name: mockSite.name,
      location: mockSite.location,
      departments,
    };
  });

  const unassigned = machines.filter((m) => !claimed.has(m.machineName));
  if (unassigned.length > 0) {
    const kiosks = unassigned.map((m) =>
      buildKiosk(
        {
          id: `k-unassigned-${m.machineName}`,
          machineName: m.machineName,
          displayName: m.machineName,
        },
        UNASSIGNED_SITE_ID,
        UNASSIGNED_DEPT_ID,
        m
      )
    );
    sites.push({
      id: UNASSIGNED_SITE_ID,
      name: "Unassigned",
      location: "Not mapped to a site",
      departments: [
        {
          id: UNASSIGNED_DEPT_ID,
          name: "Unassigned",
          siteId: UNASSIGNED_SITE_ID,
          kiosks,
        },
      ],
    });
  }

  return { name: MOCK_ORG.name, sites };
}
