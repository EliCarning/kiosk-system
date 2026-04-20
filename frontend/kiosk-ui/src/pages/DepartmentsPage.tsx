import React, { useMemo, useState } from "react";
import { useOrganization } from "../hooks/useOrganization";
import { Kiosk } from "../types/org";
import StateView from "../components/StateView";
import StatusBadge from "../components/StatusBadge";

interface DeptGroup {
  id: string;
  name: string;
  kiosks: Kiosk[];
}

const dotVariant = (kiosks: Kiosk[]): "green" | "yellow" | "red" => {
  if (kiosks.length === 0) return "red";
  const online = kiosks.filter((k) => k.status.toLowerCase() === "online").length;
  if (online === kiosks.length) return "green";
  if (online === 0) return "red";
  return "yellow";
};

const DepartmentsPage: React.FC = () => {
  const { org, loading, error, refresh } = useOrganization();
  const [expanded, setExpanded] = useState<string | null>(null);

  const departments = useMemo<DeptGroup[]>(() => {
    if (!org) return [];
    return org.sites.flatMap((site) =>
      site.departments.map((dept) => ({
        id: dept.id,
        name: dept.name || "Unassigned",
        kiosks: dept.kiosks,
      }))
    );
  }, [org]);

  const totalKiosks = useMemo(
    () => departments.reduce((sum, d) => sum + d.kiosks.length, 0),
    [departments]
  );

  const toggle = (id: string) =>
    setExpanded((prev) => (prev === id ? null : id));

  const renderBody = () => {
    if (loading && departments.length === 0) {
      return (
        <StateView
          variant="loading"
          title="Loading departments"
          message="Fetching organisation data..."
        />
      );
    }
    if (error && departments.length === 0) {
      return (
        <StateView
          variant="error"
          title="Unable to load departments"
          message={error}
          onRetry={refresh}
        />
      );
    }
    if (departments.length === 0 || totalKiosks === 0) {
      return (
        <StateView
          variant="empty"
          title="No kiosks available"
          message="No kiosks have been registered yet."
        />
      );
    }

    return (
      <div className="dept-page-grid">
        {departments.map((dept) => {
          const online = dept.kiosks.filter(
            (k) => k.status.toLowerCase() === "online"
          ).length;
          const offline = dept.kiosks.length - online;
          const variant = dotVariant(dept.kiosks);
          const isOpen = expanded === dept.id;

          return (
            <div
              key={dept.id}
              className={`dept-page-card${isOpen ? " is-expanded" : ""}`}
            >
              <button
                type="button"
                className="dept-page-card__header"
                onClick={() => toggle(dept.id)}
                aria-expanded={isOpen}
              >
                <span
                  className={`dept-page-card__dot dept-page-card__dot--${variant}`}
                />
                <div className="dept-page-card__info">
                  <span className="dept-page-card__name">{dept.name}</span>
                  <span className="dept-page-card__meta">
                    {dept.kiosks.length} kiosk{dept.kiosks.length !== 1 ? "s" : ""}{" "}
                    &bull; {online} online &bull; {offline} offline
                  </span>
                </div>
                <span className="dept-page-card__chevron" aria-hidden="true">
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <div className="dept-page-card__kiosks">
                  {dept.kiosks.length === 0 ? (
                    <div className="dept-page-card__empty">No kiosks in this department.</div>
                  ) : (
                    dept.kiosks.map((k) => (
                      <div key={k.id} className="dept-kiosk-row">
                        <StatusBadge status={k.status} />
                        <span className="dept-kiosk-row__name">{k.machineName}</span>
                        <span className="dept-kiosk-row__ip">{k.ipAddress || "—"}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Departments</h1>
          <div className="page__subtitle">
            {departments.length} department{departments.length !== 1 ? "s" : ""}{" "}
            &middot; {totalKiosks} kiosk{totalKiosks !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>
      <section className="page__body">{renderBody()}</section>
    </div>
  );
};

export default DepartmentsPage;
