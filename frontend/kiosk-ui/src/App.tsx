import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://localhost:5226";
const MACHINES_ENDPOINT = `${API_BASE_URL}/api/machines`;
const REQUEST_TIMEOUT_MS = 5000;

type MachineStatus = "Online" | "Offline" | "Warning" | string;

interface Machine {
  machineName: string;
  ipAddress: string;
  lastSeen: string;
  status: MachineStatus;
}

type ErrorKind = "timeout" | "network" | "cors" | "http" | "parse" | "unknown";

interface FetchError {
  kind: ErrorKind;
  message: string;
  display: string;
}

async function fetchMachines(signal: AbortSignal): Promise<Machine[]> {
  const response = await fetch(MACHINES_ENDPOINT, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const httpErr = new Error(
      `HTTP ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`
    );
    (httpErr as any).__httpStatus = response.status;
    throw httpErr;
  }
  try {
    return (await response.json()) as Machine[];
  } catch (e) {
    const parseErr = new Error("Failed to parse JSON response");
    (parseErr as any).__parse = true;
    throw parseErr;
  }
}

function classifyError(err: unknown, didTimeout: boolean): FetchError {
  if (didTimeout) {
    return {
      kind: "timeout",
      message: "Request timed out after 5 seconds",
      display: "Request timed out. The server did not respond within 5 seconds.",
    };
  }

  if (err instanceof Error) {
    const anyErr = err as any;

    if (anyErr.__httpStatus) {
      return {
        kind: "http",
        message: err.message,
        display: `Server responded with an error: ${err.message}`,
      };
    }

    if (anyErr.__parse) {
      return {
        kind: "parse",
        message: err.message,
        display: "Received an invalid response from the server.",
      };
    }

    const isTypeError = err.name === "TypeError";
    const msg = err.message || "";
    const looksLikeNetwork =
      isTypeError ||
      /failed to fetch|networkerror|load failed|fetch/i.test(msg);

    if (looksLikeNetwork) {
      return {
        kind: "cors",
        message: msg || "Network failure",
        display: "Cannot connect to server (CORS or server down)",
      };
    }

    return { kind: "unknown", message: msg, display: msg };
  }

  return {
    kind: "unknown",
    message: String(err),
    display: "An unknown error occurred.",
  };
}

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusVariant = (status: string): string => {
  const s = status.toLowerCase();
  if (s === "online") return "online";
  if (s === "offline") return "offline";
  if (s === "warning" || s === "degraded") return "warning";
  return "neutral";
};

const StatusBadge: React.FC<{ status: MachineStatus }> = ({ status }) => (
  <span className={`status-badge status-badge--${statusVariant(status)}`}>
    <span className="status-badge__dot" />
    {status}
  </span>
);

const SummaryCard: React.FC<{
  label: string;
  value: number | string;
  accent?: "default" | "online" | "offline" | "warning";
  hint?: string;
}> = ({ label, value, accent = "default", hint }) => (
  <div className={`summary-card summary-card--${accent}`}>
    <div className="summary-card__label">{label}</div>
    <div className="summary-card__value">{value}</div>
    {hint && <div className="summary-card__hint">{hint}</div>}
  </div>
);

const App: React.FC = () => {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<FetchError | null>(null);

  const loadMachines = useCallback(async () => {
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    let didTimeout = false;
    const timeoutId = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    const startedAt = performance.now();
    try {
      console.info(`[machines] GET ${MACHINES_ENDPOINT}`);
      const data = await fetchMachines(controller.signal);
      const elapsed = Math.round(performance.now() - startedAt);
      console.info(
        `[machines] success — ${data.length} machine(s) in ${elapsed}ms`
      );
      setMachines(data);
    } catch (err) {
      const elapsed = Math.round(performance.now() - startedAt);
      const classified = classifyError(err, didTimeout);
      console.error("[machines] fetch failed", {
        endpoint: MACHINES_ENDPOINT,
        kind: classified.kind,
        message: classified.message,
        elapsedMs: elapsed,
        raw: err,
      });
      setError(classified);
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  const stats = useMemo(() => {
    const total = machines.length;
    const online = machines.filter(
      (m) => m.status.toLowerCase() === "online"
    ).length;
    const offline = machines.filter(
      (m) => m.status.toLowerCase() === "offline"
    ).length;
    const warning = machines.filter((m) => {
      const s = m.status.toLowerCase();
      return s === "warning" || s === "degraded";
    }).length;
    return { total, online, offline, warning };
  }, [machines]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="state-view state-view--loading">
          <div className="state-view__spinner" />
          <div className="state-view__title">Loading machines…</div>
          <div className="state-view__message">
            Fetching the latest kiosk status from the server.
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="state-view state-view--error">
          <div className="state-view__icon">!</div>
          <div className="state-view__title">Unable to load machines</div>
          <div className="state-view__message">{error.display}</div>
          <div className="state-view__detail">
            <span className="state-view__tag">{error.kind}</span>
            <code>{error.message}</code>
          </div>
          <button
            className="btn btn--primary"
            onClick={loadMachines}
            disabled={loading}
          >
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      );
    }

    if (machines.length === 0) {
      return (
        <div className="state-view state-view--empty">
          <div className="state-view__icon">∅</div>
          <div className="state-view__title">No machines yet</div>
          <div className="state-view__message">
            Once kiosks come online they'll appear here.
          </div>
        </div>
      );
    }

    return (
      <div className="table-card">
        <div className="table-card__header">
          <h2 className="table-card__title">Machines</h2>
          <span className="table-card__count">{machines.length} total</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Machine Name</th>
                <th>IP Address</th>
                <th>Status</th>
                <th>Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {machines.map((m) => (
                <tr key={m.machineName}>
                  <td className="data-table__primary">{m.machineName}</td>
                  <td className="data-table__mono">{m.ipAddress}</td>
                  <td>
                    <StatusBadge status={m.status} />
                  </td>
                  <td className="data-table__muted">{formatDate(m.lastSeen)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="app-shell">
      <main className="app-main">
        <div className="dashboard">
          <header className="page-header">
            <div>
              <h1 className="page-header__title">Kiosk Dashboard</h1>
              <p className="page-header__subtitle">
                Monitor the health and status of your deployed machines
              </p>
            </div>
            <div className="page-header__actions">
              <button
                className="btn btn--primary"
                onClick={loadMachines}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="btn__spinner" />
                    Refreshing…
                  </>
                ) : (
                  "Refresh"
                )}
              </button>
            </div>
          </header>

          <section className="summary-grid">
            <SummaryCard label="Total Machines" value={stats.total} />
            <SummaryCard
              label="Online"
              value={stats.online}
              accent="online"
              hint="Active and reporting"
            />
            <SummaryCard
              label="Offline"
              value={stats.offline}
              accent="offline"
              hint="Not reachable"
            />
            <SummaryCard
              label="Warnings"
              value={stats.warning}
              accent="warning"
              hint="Needs attention"
            />
          </section>

          <section className="dashboard__content">{renderContent()}</section>
        </div>
      </main>
    </div>
  );
};

export default App;
