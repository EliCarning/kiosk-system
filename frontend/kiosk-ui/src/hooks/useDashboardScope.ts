import { useCallback, useEffect, useRef, useState } from "react";
import {
  DepartmentSummary,
  GlobalSummary,
  IssuesResponse,
  SiteSummary,
  fetchDepartmentIssues,
  fetchDepartmentSummary,
  fetchGlobalSummary,
  fetchSiteIssues,
  fetchSiteSummary,
} from "../api/dashboard";
import { RealtimeEvents, subscribeRealtime } from "../realtime/events";

export type ScopeKind = "global" | "site" | "department";

export interface DashboardScope {
  kind: ScopeKind;
  siteId?: string;
  departmentId?: string;
}

export interface DashboardScopeState {
  global: GlobalSummary | null;
  site: SiteSummary | null;
  department: DepartmentSummary | null;
  issues: IssuesResponse | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const isSyntheticId = (id?: string) =>
  !id ||
  id === "all" ||
  id.startsWith("site-unassigned") ||
  id.startsWith("dept-unassigned") ||
  id.includes(":dept-unassigned");

const POLL_INTERVAL_MS = 15000;

export function useDashboardScope(scope: DashboardScope): DashboardScopeState {
  const [global, setGlobal] = useState<GlobalSummary | null>(null);
  const [site, setSite] = useState<SiteSummary | null>(null);
  const [department, setDepartment] = useState<DepartmentSummary | null>(null);
  const [issues, setIssues] = useState<IssuesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const scopeRef = useRef(scope);
  scopeRef.current = scope;

  const load = useCallback(async () => {
    const current = scopeRef.current;
    setError(null);
    try {
      if (current.kind === "global") {
        const data = await fetchGlobalSummary();
        setGlobal(data);
        setSite(null);
        setDepartment(null);
        setIssues(null);
      } else if (current.kind === "site") {
        if (isSyntheticId(current.siteId)) {
          setSite(null);
          setDepartment(null);
          setIssues(null);
        } else {
          const [s, i] = await Promise.all([
            fetchSiteSummary(current.siteId!),
            fetchSiteIssues(current.siteId!),
          ]);
          setSite(s);
          setDepartment(null);
          setIssues(i);
        }
      } else if (current.kind === "department") {
        if (isSyntheticId(current.departmentId)) {
          setDepartment(null);
          setIssues(null);
        } else {
          const [d, i] = await Promise.all([
            fetchDepartmentSummary(current.departmentId!),
            fetchDepartmentIssues(current.departmentId!),
          ]);
          setDepartment(d);
          setIssues(i);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
  }, [scope.kind, scope.siteId, scope.departmentId, load]);

  useEffect(() => {
    const id = window.setInterval(load, POLL_INTERVAL_MS);
    const unsubMachine = subscribeRealtime(RealtimeEvents.MachineUpdated, () =>
      load()
    );
    const unsubAlert = subscribeRealtime(RealtimeEvents.AlertCreated, () =>
      load()
    );
    const unsubCmd = subscribeRealtime(RealtimeEvents.CommandUpdated, () =>
      load()
    );
    return () => {
      window.clearInterval(id);
      unsubMachine();
      unsubAlert();
      unsubCmd();
    };
  }, [load]);

  return { global, site, department, issues, loading, error, refresh: load };
}
