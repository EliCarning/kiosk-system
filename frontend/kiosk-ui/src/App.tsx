import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import OperationsPage from "./pages/OperationsPage";
import MachineDetailsPage from "./pages/MachineDetailsPage";
import { PermissionsProvider } from "./context/PermissionsContext";
import { AlertsProvider } from "./context/AlertsContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { RealtimeProvider } from "./realtime/RealtimeProvider";
import NotificationsHost from "./components/notifications/NotificationsHost";

const App: React.FC = () => {
  return (
    <PermissionsProvider>
      <BrowserRouter>
        <RealtimeProvider>
          <AlertsProvider>
            <NotificationsProvider>
              <Routes>
                <Route path="/" element={<OperationsPage />} />
                <Route
                  path="/machines/:machineName"
                  element={<MachineDetailsPage />}
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
              <NotificationsHost />
            </NotificationsProvider>
          </AlertsProvider>
        </RealtimeProvider>
      </BrowserRouter>
    </PermissionsProvider>
  );
};

export default App;
