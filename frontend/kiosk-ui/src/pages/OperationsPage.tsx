import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Topbar, { StatusFilter } from "../components/layout/Topbar";
import SummaryCards from "../components/summary/SummaryCards";
import IssuesPanel from "../components/summary/IssuesPanel";
import DepartmentSection from "../components/department/DepartmentSection";
import KioskDetailsPanel from "../components/kiosk/KioskDetailsPanel";
import SettingsModal from "../components/settings/SettingsModal";
import StateView from "../components/StateView";
import { useOrganization } from "../hooks/useOrganization";
import {
  DashboardScope,
  useDashboardScope,
} from "../hooks/useDashboardScope";
import { useCommandsInProgress } from "../hooks/useCommandsInProgress";
import { useRecentCommands } from "../hooks/useRecentCommands";
import { useAlerts } from "../context/AlertsContext";
import {
  IssueAlert,
  IssueCommand,
  IssuesResponse,
  ProblematicKiosk,
} from "../api/dashboard";
import { Kiosk, Site } from "../types/org";
import { usePermissions } from "../context/PermissionsContext";
import DashboardGrid from "../dashboard/DashboardGrid";
import type { DashboardContext } from "../dashboard/types";

const matchesSearch = (kiosk: Kiosk, q: string): boolean => {
  if (!q) return true;
  const needle = q.toLowerCase();
  return (
    kiosk.machineName.toLowerCase().includes(needle) ||
    kiosk.displayName.toLowerCase().includes(needle) ||
    kiosk.ipAddress.toLowerCase().includes(needle)
  );
};

const matchesStatus = (kiosk: Kiosk, filter: StatusFilter): boolean => {
  if (filter === "all") return true;
  const s = kiosk.status.toLowerCase();
  if (filter === "warning") return s === "warning" || s === "degraded";
  return s === filter;
};

const filterSites = (
  sites: Site[],
  siteId: string | "all",
  deptId: string | "all",
  search: string,
  status: StatusFilter
): Site[] => {
  return sites
    .filter((s) => siteId === "all" || s.id === siteId)
    .map((s) => ({
      ...s,
      departments: s.departments
        .filter((d) => deptId === "all" || d.id === deptId)
        .map((d) => ({
          ...d,
          kiosks: d.kiosks.filter(
            (k) => matchesSearch(k, search) && matchesStatus(k, status)
          ),
        }))
        .filter((d) => d.kiosks.length > 0),
    }))
    .filter((s) => s.departments.length > 0);
};

const OperationsPage: React.FC = () => {
  const {
    permissions,
    loading: permissionsLoading,
    error: permissionsError,
    refresh: refreshPermissions,
  } = usePermissions();
  const { org, loading, error, refresh } = useOrganization();
  const { alerts: activeAlerts, loading: alertsLoading } = useAlerts();
  const {
    commands: recentCommands,
    loading: recentCommandsLoading,
    error: recentCommandsError,
    refresh: refreshRecentCommands,
  } = useRecentCommands();

  const [selectedSiteId, setSelectedSiteId] = useState<string | "all">("all");
  const [selectedDeptId, setSelectedDeptId] = useState<string | "all">("all");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [hierarchyOpen, setHierarchyOpen] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem("kiosk-ui:hierarchy-open") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "kiosk-ui:hierarchy-open",
        hierarchyOpen ? "1" : "0"
      );
    } catch {
      /* ignore */
    }
  }, [hierarchyOpen]);

  const dashboardScope: DashboardScope = useMemo(() => {
    if (selectedSiteId === "all") return { kind: "global" };
    if (selectedDeptId !== "all")
      return { kind: "department", departmentId: selectedDeptId };
    return { kind: "site", siteId: selectedSiteId };
  }, [selectedSiteId, selectedDeptId]);

  const {
    global: globalSummary,
    site: siteSummary,
    department: deptSummary,
    issues,
    loading: summaryLoading,
  } = useDashboardScope(dashboardScope);

  const commandsInProgress = useCommandsInProgress();

  // Derive global issues from org data + context data (no extra API calls)
  const globalIssues = useMemo<IssuesResponse | null>(() => {
    if (!org) return null;

    const allKiosks = org.sites.flatMap((s) =>
      s.departments.flatMap((d) => d.kiosks)
    );

    const recentAlerts: IssueAlert[] = activeAlerts.slice(0, 10).map((a) => ({
      id: a.id,
      machineName: a.machineName,
      type: a.type,
      message: a.message,
      createdAt: a.createdAt,
    }));

    const failedCommands: IssueCommand[] = recentCommands
      .filter((c) => c.status.toLowerCase() === "failed")
      .slice(0, 10)
      .map((c) => ({
        id: c.id,
        machineName: c.machineName,
        type: c.type,
        createdAt: c.createdAt,
        completedAt: c.completedAt,
      }));

    const problematicKiosks: ProblematicKiosk[] = allKiosks
      .filter((k) => k.status.toLowerCase() !== "online")
      .slice(0, 10)
      .map((k) => ({
        machineName: k.machineName,
        status: k.status,
        lastSeen: k.lastSeen ?? "",
        activeAlerts: 0,
        reason:
          k.status.toLowerCase() === "offline"
            ? "Not reachable"
            : k.status,
      }));

    return { recentAlerts, failedCommands, problematicKiosks };
  }, [org, activeAlerts, recentCommands]);

  useEffect(() => {
    if (org) setLastUpdated(new Date());
  }, [org]);

  useEffect(() => {
    if (!org || !selectedKiosk) return;
    const fresh = org.sites
      .flatMap((s) => s.departments.flatMap((d) => d.kiosks))
      .find((k) => k.id === selectedKiosk.id);
    if (fresh && fresh !== selectedKiosk) setSelectedKiosk(fresh);
  }, [org, selectedKiosk]);

  const handleSelectSite = (siteId: string | "all") => {
    setSelectedSiteId(siteId);
    setSelectedDeptId("all");
  };

  const handleSelectDept = (siteId: string, deptId: string | "all") => {
    setSelectedSiteId(siteId);
    setSelectedDeptId(deptId);
  };

  const selectKioskByName = (machineName: string) => {
    if (!org) return;
    const fresh = org.sites
      .flatMap((s) => s.departments.flatMap((d) => d.kiosks))
      .find((k) => k.machineName === machineName);
    if (fresh) setSelectedKiosk(fresh);
  };

  const visibleSites = useMemo(() => {
    if (!org) return [];
    return filterSites(
      org.sites,
      selectedSiteId,
      selectedDeptId,
      search,
      statusFilter
    );
  }, [org, selectedSiteId, selectedDeptId, search, statusFilter]);

  const selectedSite = useMemo(
    () =>
      org && selectedSiteId !== "all"
        ? org.sites.find((s) => s.id === selectedSiteId) ?? null
        : null,
    [org, selectedSiteId]
  );

  const selectedDept = useMemo(() => {
    if (!selectedSite || selectedDeptId === "all") return null;
    return (
      selectedSite.departments.find((d) => d.id === selectedDeptId) ?? null
    );
  }, [selectedSite, selectedDeptId]);

  const scopeKind = dashboardScope.kind;

  const renderBody = () => {
    if (loading && !org) {
      return (
        <StateView
          variant="loading"
          title="Loading operations"
          message="Fetching kiosks from backend..."
        />
      );
    }
    if (error && !org) {
      return (
        <StateView
          variant="error"
          title="Unable to load"
          message={error}
          onRetry={refresh}
        />
      );
    }
    if (!org) return null;

    if (scopeKind === "global") {
      const dashCtx: DashboardContext = {
        globalSummary,
        summaryLoading,
        commandsInProgress,
        globalIssues,
        recentCommands,
        recentCommandsLoading,
        recentCommandsError,
        refreshRecentCommands,
        org,
        alertsLoading,
        onSelectMachine: selectKioskByName,
        onSelectSite: handleSelectSite,
      };
      return <DashboardGrid ctx={dashCtx} />;
    }

    if (scopeKind === "site") {
      return (
        <>
          <SummaryCards
            scope="site"
            site={siteSummary}
            loading={summaryLoading}
            commandsInProgress={commandsInProgress}
          />

          {selectedSite && (
            <section className="dept-summary-grid">
              {selectedSite.departments.map((d) => {
                const total = d.kiosks.length;
                const online = d.kiosks.filter(
                  (k) => k.status.toLowerCase() === "online"
                ).length;
                const isActive = selectedDeptId === d.id;
                return (
                  <button
                    key={d.id}
                    className={`dept-summary-card${
                      isActive ? " is-active" : ""
                    }`}
                    onClick={() => handleSelectDept(selectedSite.id, d.id)}
                  >
                    <div className="dept-summary-card__name">{d.name}</div>
                    <div className="dept-summary-card__stats">
                      <span>
                        <strong>{online}</strong>/{total} online
                      </span>
                    </div>
                  </button>
                );
              })}
            </section>
          )}

          <IssuesPanel
            title={`Issues · ${selectedSite?.name ?? "site"}`}
            issues={issues}
            loading={summaryLoading}
            onSelectMachine={selectKioskByName}
            emptyMessage="This site has no active issues right now."
          />

          {visibleSites.length === 0 ? (
            <StateView
              variant="empty"
              title="No matching kiosks"
              message="Adjust filters or search to see more kiosks."
            />
          ) : (
            visibleSites.map((site) => (
              <section key={site.id} className="site-block">
                <header className="site-block__head">
                  <div>
                    <h2 className="site-block__title">{site.name}</h2>
                    <div className="site-block__loc">{site.location}</div>
                  </div>
                </header>
                {site.departments.map((d) => (
                  <DepartmentSection
                    key={d.id}
                    department={d}
                    selectedKioskId={selectedKiosk?.id ?? null}
                    onSelectKiosk={setSelectedKiosk}
                  />
                ))}
              </section>
            ))
          )}
        </>
      );
    }

    return (
      <>
        <SummaryCards
          scope="department"
          department={deptSummary}
          loading={summaryLoading}
          commandsInProgress={commandsInProgress}
        />

        <IssuesPanel
          title={`Issues · ${selectedDept?.name ?? "department"}`}
          issues={issues}
          loading={summaryLoading}
          onSelectMachine={selectKioskByName}
          emptyMessage="This department has no active issues right now."
        />

        {visibleSites.length === 0 ? (
          <StateView
            variant="empty"
            title="No matching kiosks"
            message="Adjust filters or search to see more kiosks."
          />
        ) : (
          visibleSites.map((site) => (
            <section key={site.id} className="site-block">
              <header className="site-block__head">
                <div>
                  <h2 className="site-block__title">{site.name}</h2>
                  <div className="site-block__loc">{site.location}</div>
                </div>
              </header>
              {site.departments.map((d) => (
                <DepartmentSection
                  key={d.id}
                  department={d}
                  selectedKioskId={selectedKiosk?.id ?? null}
                  onSelectKiosk={setSelectedKiosk}
                />
              ))}
            </section>
          ))
        )}
      </>
    );
  };

  if (permissionsLoading && !permissions) {
    return (
      <div className="ops-layout ops-layout--blocked">
        <StateView
          variant="loading"
          title="Checking access"
          message="Verifying your permissions..."
        />
      </div>
    );
  }

  if (permissionsError) {
    return (
      <div className="ops-layout ops-layout--blocked">
        <StateView
          variant="error"
          title="Unable to verify access"
          message={permissionsError}
          onRetry={refreshPermissions}
        />
      </div>
    );
  }

  if (!permissions?.canView) {
    return (
      <div className="ops-layout ops-layout--blocked">
        <StateView
          variant="error"
          title="Access denied"
          message={
            permissions?.username
              ? `${permissions.username} is not authorized to view the kiosk dashboard.`
              : "You are not authorized to view the kiosk dashboard."
          }
          onRetry={refreshPermissions}
        />
      </div>
    );
  }

  return (
    <div
      className={`ops-layout${
        hierarchyOpen ? " ops-layout--with-hierarchy" : ""
      }`}
    >
      {hierarchyOpen && (
        <Sidebar
          org={org}
          selectedSiteId={selectedSiteId}
          selectedDepartmentId={selectedDeptId}
          onSelectSite={handleSelectSite}
          onSelectDepartment={handleSelectDept}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      <div className="ops-main">
        <Topbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={refresh}
          refreshing={loading}
          lastUpdated={lastUpdated}
          sidePanelOpen={hierarchyOpen}
          onToggleSidePanel={() => setHierarchyOpen((v) => !v)}
          editDashboardActive={false}
          onEditDashboard={undefined}
          sites={org?.sites.map((s) => ({ id: s.id, name: s.name })) ?? []}
          selectedSiteId={selectedSiteId}
          onSiteChange={handleSelectSite}
        />

        <div className="ops-content">
          <div className="ops-content__main">{renderBody()}</div>

          {selectedKiosk && (
            <KioskDetailsPanel
              kiosk={selectedKiosk}
              onClose={() => setSelectedKiosk(null)}
            />
          )}
        </div>
      </div>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
};

export default OperationsPage;
