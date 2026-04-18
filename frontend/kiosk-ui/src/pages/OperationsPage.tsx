import React, { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/layout/Sidebar";
import Topbar, { StatusFilter } from "../components/layout/Topbar";
import SummaryCards from "../components/summary/SummaryCards";
import SiteOverviewCard from "../components/site/SiteOverviewCard";
import DepartmentSection from "../components/department/DepartmentSection";
import KioskDetailsPanel from "../components/kiosk/KioskDetailsPanel";
import SettingsModal from "../components/settings/SettingsModal";
import StateView from "../components/StateView";
import { useOrganization } from "../hooks/useOrganization";
import { Kiosk, OrgSummary, Site } from "../types/org";

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

const summarize = (sites: Site[]): OrgSummary => {
  const all = sites.flatMap((s) => s.departments.flatMap((d) => d.kiosks));
  return {
    sites: sites.length,
    totalKiosks: all.length,
    online: all.filter((k) => k.status.toLowerCase() === "online").length,
    offline: all.filter((k) => k.status.toLowerCase() === "offline").length,
    warnings: all.filter((k) => {
      const s = k.status.toLowerCase();
      return s === "warning" || s === "degraded";
    }).length,
  };
};

const OperationsPage: React.FC = () => {
  const { org, loading, error, refresh } = useOrganization();

  const [selectedSiteId, setSelectedSiteId] = useState<string | "all">("all");
  const [selectedDeptId, setSelectedDeptId] = useState<string | "all">("all");
  const [search, setSearch] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedKiosk, setSelectedKiosk] = useState<Kiosk | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

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

  const summary = useMemo(
    () => (org ? summarize(org.sites) : null),
    [org]
  );

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

    if (visibleSites.length === 0) {
      return (
        <StateView
          variant="empty"
          title="No matching kiosks"
          message="Adjust filters or search to see more kiosks."
        />
      );
    }

    return (
      <>
        {selectedSiteId === "all" && (
          <section className="site-grid">
            {visibleSites.map((s) => (
              <SiteOverviewCard
                key={s.id}
                site={s}
                onSelect={() => handleSelectSite(s.id)}
              />
            ))}
          </section>
        )}

        {visibleSites.map((site) => (
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
        ))}
      </>
    );
  };

  return (
    <div className="ops-layout">
      <Sidebar
        org={org}
        selectedSiteId={selectedSiteId}
        selectedDepartmentId={selectedDeptId}
        onSelectSite={handleSelectSite}
        onSelectDepartment={handleSelectDept}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="ops-main">
        <Topbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onRefresh={refresh}
          refreshing={loading}
          lastUpdated={lastUpdated}
        />

        <div className="ops-content">
          <div className="ops-content__main">
            {summary && <SummaryCards summary={summary} />}
            {renderBody()}
          </div>

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
