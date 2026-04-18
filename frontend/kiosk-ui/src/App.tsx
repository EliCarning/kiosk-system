import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import OperationsPage from "./pages/OperationsPage";
import MachineDetailsPage from "./pages/MachineDetailsPage";
import { PermissionsProvider } from "./context/PermissionsContext";
import { AlertsProvider } from "./context/AlertsContext";

const App: React.FC = () => {
  return (
    <PermissionsProvider>
      <BrowserRouter>
        <AlertsProvider>
          <Routes>
            <Route path="/" element={<OperationsPage />} />
            <Route
              path="/machines/:machineName"
              element={<MachineDetailsPage />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AlertsProvider>
      </BrowserRouter>
    </PermissionsProvider>
  );
};

export default App;
