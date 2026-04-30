import React, { useState } from "react";
import type { DashboardState, WidgetType } from "./types";
import { WIDGET_REGISTRY } from "./widgetRegistry";
import AddWidgetModal from "./AddWidgetModal";
import {
  PRESET_EXECUTIVE,
  PRESET_FLEET,
  PRESET_OPERATIONS,
} from "./LayoutPresets";

interface Props {
  state: DashboardState;
  onAddWidget: (type: WidgetType) => void;
  onResetToDefault: () => void;
  onApplyPreset: (preset: DashboardState) => void;
  onClose: () => void;
}

const PRESETS = [
  { label: "Executive", preset: PRESET_EXECUTIVE },
  { label: "Operations", preset: PRESET_OPERATIONS },
  { label: "Fleet", preset: PRESET_FLEET },
];

const DashboardToolbar: React.FC<Props> = ({
  state,
  onAddWidget,
  onResetToDefault,
  onApplyPreset,
  onClose,
}) => {
  const [addOpen, setAddOpen] = useState(false);
  const existingTypes = new Set(Object.values(state.types));

  return (
    <>
      <div className="dash-toolbar">
        <div className="dash-toolbar__left">
          <span className="dash-toolbar__label">Editing dashboard</span>
          <select
            className="select select--sm"
            defaultValue=""
            onChange={(e) => {
              const found = PRESETS.find((p) => p.label === e.target.value);
              if (found) onApplyPreset(found.preset);
              (e.target as HTMLSelectElement).value = "";
            }}
          >
            <option value="" disabled>
              Apply preset…
            </option>
            {PRESETS.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
          <button
            className="btn btn--ghost"
            onClick={() => setAddOpen(true)}
          >
            + Add widget
          </button>
          <button className="btn btn--ghost" onClick={onResetToDefault}>
            Reset
          </button>
        </div>
        <div className="dash-toolbar__right">
          <span className="dash-toolbar__hint">
            Drag widgets to reorder · Resize from corners
          </span>
          <button className="btn" onClick={onClose}>
            Done editing
          </button>
        </div>
      </div>

      <AddWidgetModal
        open={addOpen}
        existing={existingTypes}
        onAdd={(type) => {
          onAddWidget(type);
          setAddOpen(false);
        }}
        onClose={() => setAddOpen(false)}
      />
    </>
  );
};

export default DashboardToolbar;
