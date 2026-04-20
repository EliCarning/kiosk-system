import React from "react";
import { useTheme, Theme } from "../context/ThemeContext";
import { useSettings, REFRESH_INTERVAL_OPTIONS } from "../context/SettingsContext";

const SettingsPage: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { autoRefresh, setAutoRefresh, intervalMs, setIntervalMs } =
    useSettings();

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">Settings</h1>
          <div className="page__subtitle">
            UI preferences and behaviour controls
          </div>
        </div>
      </header>

      <div className="settings-sections">
        {/* Appearance */}
        <section className="settings-section">
          <div className="settings-section__header">
            <h2 className="settings-section__title">Appearance</h2>
            <p className="settings-section__desc">
              Controls how the interface looks.
            </p>
          </div>
          <div className="settings-section__body">
            <div className="settings-row">
              <div className="settings-row__label">
                <span className="settings-row__label-text">Theme</span>
                <span className="settings-row__hint">
                  {theme === "dark" ? "Dark mode active" : "Light mode active"}
                </span>
              </div>
              <div className="theme-picker">
                {(["dark", "light"] as Theme[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`theme-picker__btn${theme === t ? " is-active" : ""}`}
                    onClick={() => setTheme(t)}
                  >
                    {t === "dark" ? "Dark" : "Light"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Data Refresh */}
        <section className="settings-section">
          <div className="settings-section__header">
            <h2 className="settings-section__title">Data Refresh</h2>
            <p className="settings-section__desc">
              Controls how often data is fetched from the backend.
            </p>
          </div>
          <div className="settings-section__body">
            <div className="settings-row">
              <div className="settings-row__label">
                <span className="settings-row__label-text">Auto-refresh</span>
                <span className="settings-row__hint">
                  Automatically poll for updated kiosk data
                </span>
              </div>
              <label className="settings-toggle" aria-label="Toggle auto-refresh">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <span className="settings-toggle__track">
                  <span className="settings-toggle__thumb" />
                </span>
              </label>
            </div>

            <div className="settings-row">
              <div className="settings-row__label">
                <span className="settings-row__label-text">
                  Refresh interval
                </span>
                <span className="settings-row__hint">
                  {autoRefresh
                    ? "How often to poll for updates"
                    : "Enable auto-refresh to configure"}
                </span>
              </div>
              <select
                className="select"
                value={intervalMs}
                disabled={!autoRefresh}
                onChange={(e) => setIntervalMs(Number(e.target.value))}
              >
                {REFRESH_INTERVAL_OPTIONS.map(({ ms, label }) => (
                  <option key={ms} value={ms}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* System — future placeholder, no empty box */}
        <section className="settings-section settings-section--muted">
          <div className="settings-section__header">
            <h2 className="settings-section__title">System</h2>
            <p className="settings-section__desc">
              Agent key management, role group mapping, and notification
              preferences will appear here in a future release.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
