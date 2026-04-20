import React from "react";

export interface TabDef<T extends string = string> {
  id: T;
  label: string;
  badge?: React.ReactNode;
}

interface TabsProps<T extends string = string> {
  tabs: TabDef<T>[];
  active: T;
  onChange: (id: T) => void;
  ariaLabel?: string;
}

function Tabs<T extends string = string>({
  tabs,
  active,
  onChange,
  ariaLabel,
}: TabsProps<T>): React.ReactElement {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="tabs"
    >
      {tabs.map((t) => {
        const selected = t.id === active;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className={`tabs__tab${selected ? " tabs__tab--active" : ""}`}
            onClick={() => onChange(t.id)}
          >
            <span>{t.label}</span>
            {t.badge !== undefined && t.badge !== null && (
              <span className="tabs__badge">{t.badge}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
