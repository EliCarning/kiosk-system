import React from "react";
import { WIDGET_ORDER, WIDGET_REGISTRY } from "./widgetRegistry";
import type { WidgetType } from "./types";

interface Props {
  open: boolean;
  existing: Set<WidgetType>;
  onAdd: (type: WidgetType) => void;
  onClose: () => void;
  allowDuplicates?: boolean;
}

const AddWidgetModal: React.FC<Props> = ({ open, existing, onAdd, onClose, allowDuplicates = false }) => {
  if (!open) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal add-widget-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <h3 className="modal__title">Add widget</h3>
          <button className="modal__close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="add-widget-grid">
          {WIDGET_ORDER.map((type) => {
            const meta = WIDGET_REGISTRY[type];
            const added = existing.has(type);
            const blocked = added && !allowDuplicates;
            return (
              <button
                key={type}
                className={`add-widget-card${added ? " add-widget-card--added" : ""}`}
                onClick={() => { if (!blocked) { onAdd(type); onClose(); } }}
                disabled={blocked}
              >
                <div className="add-widget-card__label">{meta.label}</div>
                <div className="add-widget-card__desc">{meta.description}</div>
                {added && <div className="add-widget-card__badge">On dashboard</div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AddWidgetModal;
