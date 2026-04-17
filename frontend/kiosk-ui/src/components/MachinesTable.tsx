import React from "react";
import { Machine } from "../types/machine";
import StatusBadge from "./StatusBadge";

interface MachinesTableProps {
  machines: Machine[];
}

const formatDate = (iso: string): string => {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const MachinesTable: React.FC<MachinesTableProps> = ({ machines }) => {
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

export default MachinesTable;
