import { fetchMachines } from "./machines";
import { fetchSites, fetchDepartmentsBySite, SiteDto, DepartmentDto } from "./sites";
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

const UNASSIGNED_SITE_ID = "site-unassigned";
const UNASSIGNED_SITE_NAME = "Unassigned";
const UNASSIGNED_SITE_LOCATION = "Kiosks not yet assigned to a site";
const UNASSIGNED_DEPT_ID = "dept-unassigned";
const UNASSIGNED_DEPT_NAME = "Unassigned";
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

const buildChecks = (machineName: string, online: boolean): KioskCheck[] => [
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

const machineToKiosk = (
  m: Machine,
  siteId: string,
  departmentId: string
): Kiosk => {
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
    siteId,
    departmentId,
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
  const [machines, sites] = await Promise.all([fetchMachines(), fetchSites()]);
  const deptLists = await Promise.all(
    sites.map((s) => fetchDepartmentsBySite(s.id).catch(() => []))
  );
  const departments: DepartmentDto[] = deptLists.flat();
  return composeOrganization(machines, sites, departments);
}

export function composeOrganization(
  machines: Machine[],
  sites: SiteDto[],
  departments: DepartmentDto[]
): Organization {
  const siteMap = new Map<string, Site>();
  const deptMap = new Map<string, Department>();

  for (const s of sites) {
    siteMap.set(s.id, {
      id: s.id,
      name: s.name,
      location: "",
      departments: [],
    });
  }

  for (const d of departments) {
    const site = siteMap.get(d.siteId);
    if (!site) continue;
    const dept: Department = {
      id: d.id,
      name: d.name,
      siteId: d.siteId,
      kiosks: [],
    };
    site.departments.push(dept);
    deptMap.set(d.id, dept);
  }

  const getUnassignedDeptForSite = (site: Site): Department => {
    const key = `${site.id}:${UNASSIGNED_DEPT_ID}`;
    let dept = deptMap.get(key);
    if (!dept) {
      dept = {
        id: key,
        name: UNASSIGNED_DEPT_NAME,
        siteId: site.id,
        kiosks: [],
      };
      site.departments.push(dept);
      deptMap.set(key, dept);
    }
    return dept;
  };

  let unassignedSite: Site | null = null;
  const getUnassignedSite = (): Site => {
    if (unassignedSite) return unassignedSite;
    unassignedSite = {
      id: UNASSIGNED_SITE_ID,
      name: UNASSIGNED_SITE_NAME,
      location: UNASSIGNED_SITE_LOCATION,
      departments: [
        {
          id: UNASSIGNED_DEPT_ID,
          name: UNASSIGNED_DEPT_NAME,
          siteId: UNASSIGNED_SITE_ID,
          kiosks: [],
        },
      ],
    };
    siteMap.set(UNASSIGNED_SITE_ID, unassignedSite);
    deptMap.set(UNASSIGNED_DEPT_ID, unassignedSite.departments[0]);
    return unassignedSite;
  };

  for (const m of machines) {
    const siteId = m.siteId && siteMap.has(m.siteId) ? m.siteId : null;
    const site = siteId ? siteMap.get(siteId)! : getUnassignedSite();

    let dept: Department;
    if (m.departmentId && deptMap.has(m.departmentId)) {
      const candidate = deptMap.get(m.departmentId)!;
      dept = candidate.siteId === site.id ? candidate : getUnassignedDeptForSite(site);
    } else {
      dept = getUnassignedDeptForSite(site);
    }

    dept.kiosks.push(machineToKiosk(m, site.id, dept.id));
  }

  const orderedSites = Array.from(siteMap.values())
    .filter((s) => s.id !== UNASSIGNED_SITE_ID)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (unassignedSite && unassignedSite.departments.some((d) => d.kiosks.length > 0)) {
    orderedSites.push(unassignedSite);
  }

  return { name: ORG_NAME, sites: orderedSites };
}
