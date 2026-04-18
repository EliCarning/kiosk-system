import React from "react";
import { Department, Kiosk } from "../../types/org";
import KioskCard from "../kiosk/KioskCard";

interface DepartmentSectionProps {
  department: Department;
  selectedKioskId: string | null;
  onSelectKiosk: (kiosk: Kiosk) => void;
}

const DepartmentSection: React.FC<DepartmentSectionProps> = ({
  department,
  selectedKioskId,
  onSelectKiosk,
}) => {
  if (department.kiosks.length === 0) return null;

  const online = department.kiosks.filter(
    (k) => k.status.toLowerCase() === "online"
  ).length;

  return (
    <section className="dept-section">
      <header className="dept-section__head">
        <h3 className="dept-section__title">{department.name}</h3>
        <span className="dept-section__count">
          {online}/{department.kiosks.length} online
        </span>
      </header>
      <div className="kiosk-grid">
        {department.kiosks.map((k) => (
          <KioskCard
            key={k.id}
            kiosk={k}
            selected={selectedKioskId === k.id}
            onSelect={onSelectKiosk}
          />
        ))}
      </div>
    </section>
  );
};

export default DepartmentSection;
