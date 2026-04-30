import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useOrganization } from "../hooks/useOrganization";
import { createCommand } from "../api/actions";
import { bulkAssignKiosks, fetchUnassignedKiosks } from "../api/machines";
import { Kiosk } from "../types/org";
import { CommandType } from "../types/command";
import StatusBadge from "../components/StatusBadge";
import StateView from "../components/StateView";

interface BulkActionDef {
  type: CommandType;
  label: string;
  danger?: boolean;
  requiresConfirm?: boolean;
}

const BULK_ACTIONS: BulkActionDef[] = [
  { type: "refresh_cache", label: "Refresh Cache" },
  { type: "restart_service", label: "Restart Service" },
  { type: "restart_browser", label: "Restart Browser" },
  { type: "collect_system_info", label: "Collect System Info" },
  { type: "collect_event_logs", label: "Collect Event Logs" },
  { type: "restart_agent", label: "Restart Agent", requiresConfirm: true },
  { type: "reboot", label: "Reboot", danger: true, requiresConfirm: true },
];

type StatusFilter = "all" | "online" | "offline" | "warning" | "unassigned";

const formatRelative = (iso: string | null): string => {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Math.max(0, Date.now() - t);
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

interface BulkResult {
  label: string;
  success: number;
  failed: number;
  total: number;
}

const KiosksPage: React.FC = () => {
  const navigate = useNavigate();
  const { org, loading, error, refresh } = useOrganization();

  const [searchParams, setSearchParams] = useSearchParams();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState<string>("");
  const statusFilter = (searchParams.get("status") as StatusFilter) ?? "all";
  const setStatusFilter = (s: StatusFilter) => {
    if (s === "all") setSearchParams({});
    else setSearchParams({ status: s });
  };
  const [executing, setExecuting] = useState<CommandType | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  // Unassigned kiosks (no site/department) fetched separately
  const [unassigned, setUnassigned] = useState<Kiosk[]>([]);
  const [assignSiteId, setAssignSiteId] = useState<string>("");
  const [assignDeptId, setAssignDeptId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    fetchUnassignedKiosks()
      .then((machines) =>
        setUnassigned(
          machines.map((m) => ({
            id: m.machineName,
            machineName: m.machineName,
            displayName: m.machineName,
            ipAddress: m.ipAddress,
            status: m.status,
            lastSeen: m.lastSeen,
            siteId: null,
            departmentId: null,
            checks: [],
            history: [],
            browser: { name: "", version: "", running: false },
            network: { gateway: "", dns: "", latencyMs: null },
            gpo: { lastApplied: null, version: "" },
          }))
        )
      )
      .catch(() => {});
  }, []);

  const allKiosks = useMemo<Kiosk[]>(() => {
    const assigned = org
      ? org.sites.flatMap((s) => s.departments.flatMap((d) => d.kiosks))
      : [];
    return [...assigned, ...unassigned];
  }, [org, unassigned]);

  const siteLookup = useMemo(() => {
    const map = new Map<string, { site: string; department: string }>();
    if (!org) return map;
    org.sites.forEach((s) =>
      s.departments.forEach((d) =>
        d.kiosks.forEach((k) =>
          map.set(k.machineName, { site: s.name, department: d.name })
        )
      )
    );
    return map;
  }, [org]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allKiosks.filter((k) => {
      if (statusFilter === "unassigned") {
        if (k.siteId || k.departmentId) return false;
      } else if (statusFilter !== "all") {
        const s = k.status.toLowerCase();
        if (statusFilter === "warning") {
          if (s !== "warning" && s !== "degraded") return false;
        } else if (s !== statusFilter) {
          return false;
        }
      }
      if (!needle) return true;
      return (
        k.machineName.toLowerCase().includes(needle) ||
        k.displayName.toLowerCase().includes(needle) ||
        k.ipAddress.toLowerCase().includes(needle)
      );
    });
  }, [allKiosks, search, statusFilter]);

  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(filtered.map((k) => k.machineName));
      const next = new Set<string>();
      prev.forEach((name) => {
        if (visible.has(name)) next.add(name);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  const toggleOne = (machineName: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(machineName)) next.delete(machineName);
      else next.add(machineName);
      return next;
    });
  };

  const visibleAllSelected =
    filtered.length > 0 && filtered.every((k) => selected.has(k.machineName));
  const visibleSomeSelected =
    !visibleAllSelected &&
    filtered.some((k) => selected.has(k.machineName));

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (visibleAllSelected) {
        filtered.forEach((k) => next.delete(k.machineName));
      } else {
        filtered.forEach((k) => next.add(k.machineName));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const runBulk = useCallback(
    async (action: BulkActionDef) => {
      if (executing || selected.size === 0) return;
      if (action.requiresConfirm) {
        const ok = window.confirm(
          `${action.label} on ${selected.size} kiosk${
            selected.size === 1 ? "" : "s"
          }? This cannot be undone.`
        );
        if (!ok) return;
      }
      setExecuting(action.type);
      setResult(null);
      const targets = Array.from(selected);
      const outcomes = await Promise.allSettled(
        targets.map((name) => createCommand(name, action.type, ""))
      );
      const success = outcomes.filter((o) => o.status === "fulfilled").length;
      const failed = outcomes.length - success;
      setResult({
        label: action.label,
        success,
        failed,
        total: outcomes.length,
      });
      setExecuting(null);
      if (failed === 0) clearSelection();
    },
    [executing, selected]
  );

  const handleAssign = useCallback(async () => {
    if (assigning || selected.size === 0) return;
    setAssigning(true);
    try {
      const { updated } = await bulkAssignKiosks(
        Array.from(selected),
        assignSiteId || null,
        assignDeptId || null
      );
      setResult({ label: "Assign", success: updated, failed: 0, total: updated });
      clearSelection();
      setUnassigned([]);
      refresh();
      fetchUnassignedKiosks()
        .then((machines) =>
          setUnassigned(
            machines.map((m) => ({
              id: m.machineName,
              machineName: m.machineName,
              displayName: m.machineName,
              ipAddress: m.ipAddress,
              status: m.status,
              lastSeen: m.lastSeen,
              siteId: null,
              departmentId: null,
              checks: [],
              history: [],
              browser: { name: "", version: "", running: false },
              network: { gateway: "", dns: "", latencyMs: null },
              gpo: { lastApplied: null, version: "" },
            }))
          )
        )
        .catch(() => {});
    } catch (e) {
      setResult({
        label: "Assign",
        success: 0,
        failed: selected.size,
        total: selected.size,
      });
    } finally {
      setAssigning(false);
    }
  }, [assigning, selected, assignSiteId, assignDeptId, refresh]);

  const selectAllRef = useCallback(
    (node: HTMLInputElement | null) => {
      if (node) node.indeterminate = visibleSomeSelected;
    },
    [visibleSomeSelected]
  );

  const renderBulkBar = () => {
    if (selected.size === 0) return null;
    return (
      <div className="bulk-bar" role="region" aria-label="Bulk actions">
        <div className="bulk-bar__info">
          <strong>{selected.size}</strong> selected
          <button
            type="button"
            className="linklike bulk-bar__clear"
            onClick={clearSelection}
          >
            Clear
          </button>
        </div>
        <div className="bulk-bar__actions">
          {BULK_ACTIONS.map((a) => {
            const isRunning = executing === a.type;
            return (
              <button
                key={a.type}
                className={`btn${a.danger ? " btn--danger" : ""}${
                  isRunning ? " is-loading" : ""
                }`}
                onClick={() => runBulk(a)}
                disabled={executing !== null}
                aria-busy={isRunning}
              >
                {isRunning ? "Running…" : a.label}
              </button>
            );
          })}
          <span className="bulk-bar__sep" />
          <select
            className="select select--sm"
            value={assignSiteId}
            onChange={(e) => { setAssignSiteId(e.target.value); setAssignDeptId(""); }}
            title="Assign to site"
          >
            <option value="">— Site —</option>
            {org?.sites.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <select
            className="select select--sm"
            value={assignDeptId}
            onChange={(e) => setAssignDeptId(e.target.value)}
            title="Assign to department"
          >
            <option value="">— Dept —</option>
            {org?.sites
              .find((s) => s.id === assignSiteId)
              ?.departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
          </select>
          <button
            className={`btn${assigning ? " is-loading" : ""}`}
            onClick={handleAssign}
            disabled={assigning || (!assignSiteId && !assignDeptId)}
            title="Assign selected kiosks to site/department"
          >
            {assigning ? "Assigning…" : "Assign"}
          </button>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!result) return null;
    const cls =
      result.failed === 0
        ? "bulk-result bulk-result--success"
        : result.success === 0
        ? "bulk-result bulk-result--error"
        : "bulk-result bulk-result--partial";
    const text =
      result.failed === 0
        ? `${result.label} queued on ${result.success} kiosk${
            result.success === 1 ? "" : "s"
          }.`
        : result.success === 0
        ? `${result.label} failed on all ${result.total} kiosk${
            result.total === 1 ? "" : "s"
          }.`
        : `${result.label} queued on ${result.success} of ${result.total} — ${result.failed} failed.`;
    return (
      <div className={cls} role="status">
        {text}
        <button
          type="button"
          className="linklike bulk-result__dismiss"
          onClick={() => setResult(null)}
        >
          Dismiss
        </button>
      </div>
    );
  };

  const renderBody = () => {
    if (loading && allKiosks.length === 0) {
      return (
        <StateView
          variant="loading"
          title="Loading kiosks"
          message="Fetching kiosks from backend..."
        />
      );
    }
    if (error && allKiosks.length === 0) {
      return (
        <StateView
          variant="error"
          title="Unable to load kiosks"
          message={error}
          onRetry={refresh}
        />
      );
    }
    if (filtered.length === 0) {
      return (
        <StateView
          variant="empty"
          title="No kiosks"
          message={
            search || statusFilter !== "all"
              ? "Adjust filters to see more kiosks."
              : "No kiosks have been registered yet."
          }
        />
      );
    }
    return (
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="table__col-check">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={visibleAllSelected}
                  onChange={toggleAllVisible}
                  aria-label="Select all visible kiosks"
                />
              </th>
              <th>Status</th>
              <th>Machine</th>
              <th>Display name</th>
              <th>Site</th>
              <th>Department</th>
              <th>IP</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((k) => {
              const isSelected = selected.has(k.machineName);
              const loc = siteLookup.get(k.machineName);
              return (
                <tr
                  key={k.id}
                  className={isSelected ? "is-selected" : undefined}
                >
                  <td className="table__col-check">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(k.machineName)}
                      aria-label={`Select ${k.machineName}`}
                    />
                  </td>
                  <td>
                    <StatusBadge status={k.status} />
                  </td>
                  <td>
                    <button
                      className="linklike"
                      onClick={() =>
                        navigate(
                          `/kiosks/${encodeURIComponent(k.machineName)}`
                        )
                      }
                    >
                      {k.machineName}
                    </button>
                  </td>
                  <td>{k.displayName}</td>
                  <td>{loc?.site ?? "—"}</td>
                  <td>{loc?.department ?? "—"}</td>
                  <td className="td-nowrap">{k.ipAddress || "—"}</td>
                  <td className="td-nowrap">{formatRelative(k.lastSeen)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Kiosks</h1>
          <div className="page__subtitle">
            {allKiosks.length} total · {filtered.length} shown
          </div>
        </div>
        <div className="page__actions">
          <button className="btn" onClick={refresh} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      <div className="page__filters">
        <input
          className="input"
          placeholder="Search machine, display name, or IP…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="warning">Warning</option>
          <option value="unassigned">Unassigned {unassigned.length > 0 ? `(${unassigned.length})` : ""}</option>
        </select>
      </div>

      {renderBulkBar()}
      {renderResult()}

      <section className="page__body">{renderBody()}</section>
    </div>
  );
};

export default KiosksPage;
