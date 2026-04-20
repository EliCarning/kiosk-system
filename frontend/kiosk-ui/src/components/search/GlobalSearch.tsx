import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useKiosks } from "../../hooks/useKiosks";
import { useDebounced } from "../../hooks/useDebounced";
import { Kiosk } from "../../types/org";
import StatusBadge from "../StatusBadge";

interface GlobalSearchProps {
  collapsed?: boolean;
  maxResults?: number;
}

const DEBOUNCE_MS = 300;

const matches = (k: Kiosk, needle: string): boolean => {
  if (!needle) return false;
  return (
    k.machineName.toLowerCase().includes(needle) ||
    (k.ipAddress ? k.ipAddress.toLowerCase().includes(needle) : false)
  );
};

const scoreKiosk = (k: Kiosk, needle: string): number => {
  const m = k.machineName.toLowerCase();
  const ip = (k.ipAddress || "").toLowerCase();
  if (m === needle || ip === needle) return 0;
  if (m.startsWith(needle)) return 1;
  if (ip.startsWith(needle)) return 2;
  if (m.includes(needle)) return 3;
  if (ip.includes(needle)) return 4;
  return 5;
};

const SearchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

const GlobalSearch: React.FC<GlobalSearchProps> = ({
  collapsed = false,
  maxResults = 8,
}) => {
  const navigate = useNavigate();
  const { kiosks, loading } = useKiosks();
  const [query, setQuery] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);
  const [highlight, setHighlight] = useState<number>(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const debounced = useDebounced(query.trim().toLowerCase(), DEBOUNCE_MS);

  const results = useMemo<Kiosk[]>(() => {
    if (!debounced) return [];
    const filtered = kiosks.filter((k) => matches(k, debounced));
    filtered.sort((a, b) => {
      const diff = scoreKiosk(a, debounced) - scoreKiosk(b, debounced);
      if (diff !== 0) return diff;
      return a.machineName.localeCompare(b.machineName);
    });
    return filtered.slice(0, maxResults);
  }, [kiosks, debounced, maxResults]);

  useEffect(() => {
    setHighlight(0);
  }, [debounced]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  const select = useCallback(
    (kiosk: Kiosk) => {
      navigate(`/kiosks/${encodeURIComponent(kiosk.machineName)}`);
      setQuery("");
      setOpen(false);
    },
    [navigate]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (query) setQuery("");
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
      setOpen(true);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
      setOpen(true);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = results[highlight] ?? results[0];
      if (pick) select(pick);
    }
  };

  const showDropdown = open && debounced.length > 0;

  return (
    <div
      ref={rootRef}
      className={`global-search${collapsed ? " global-search--collapsed" : ""}`}
    >
      <label className="global-search__field">
        <span className="global-search__icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          type="search"
          className="global-search__input"
          placeholder={
            collapsed ? "Search…" : "Search kiosks by name or IP..."
          }
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Search kiosks by name or IP"
          aria-expanded={showDropdown}
          aria-controls="global-search-results"
          autoComplete="off"
        />
        {!collapsed && (
          <span className="global-search__hint" aria-hidden="true">
            ⌘K
          </span>
        )}
      </label>

      {showDropdown && (
        <div
          id="global-search-results"
          className="global-search__results"
          role="listbox"
        >
          {loading && results.length === 0 ? (
            <div className="global-search__state">Loading kiosks…</div>
          ) : results.length === 0 ? (
            <div className="global-search__state">
              No kiosks match "{debounced}"
            </div>
          ) : (
            <>
              {results.map((k, i) => {
                const active = i === highlight;
                return (
                  <button
                    key={k.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`global-search__result${
                      active ? " is-active" : ""
                    }`}
                    onMouseEnter={() => setHighlight(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(k);
                    }}
                  >
                    <div className="global-search__result-main">
                      <span className="global-search__result-name">
                        {k.machineName}
                      </span>
                      <StatusBadge status={k.status} />
                    </div>
                    <div className="global-search__result-meta">
                      <span className="global-search__result-ip">
                        {k.ipAddress || "—"}
                      </span>
                    </div>
                  </button>
                );
              })}
              <div className="global-search__footer">
                <span>↑↓ navigate · ↵ open · esc close</span>
                <button
                  type="button"
                  className="linklike"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    close();
                  }}
                >
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
