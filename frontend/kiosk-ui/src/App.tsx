import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import OperationsPage from "./pages/OperationsPage";
import MachineDetailsPage from "./pages/MachineDetailsPage";
import KiosksPage from "./pages/KiosksPage";
import SitesPage from "./pages/SitesPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import AlertsPage from "./pages/AlertsPage";
import CommandsPage from "./pages/CommandsPage";
import ActivityPage from "./pages/ActivityPage";
import SettingsPage from "./pages/SettingsPage";
import { PermissionsProvider } from "./context/PermissionsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { AlertsProvider } from "./context/AlertsContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { RealtimeProvider } from "./realtime/RealtimeProvider";
import NotificationsHost from "./components/notifications/NotificationsHost";

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <PermissionsProvider>
        <BrowserRouter>
          <RealtimeProvider>
            <AlertsProvider>
              <NotificationsProvider>
                <Routes>
                  <Route element={<AppShell />}>
                    <Route
                      index
                      element={<Navigate to="/dashboard" replace />}
                    />
                    <Route path="/dashboard" element={<OperationsPage />} />
                    <Route path="/kiosks" element={<KiosksPage />} />
                    <Route
                      path="/kiosks/:machineName"
                      element={<MachineDetailsPage />}
                    />
                    <Route path="/sites" element={<SitesPage />} />
                    <Route path="/departments" element={<DepartmentsPage />} />
                    <Route path="/alerts" element={<AlertsPage />} />
                    <Route path="/commands" element={<CommandsPage />} />
                    <Route path="/activity" element={<ActivityPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route
                      path="/machines/:machineName"
                      element={<MachineDetailsPage />}
                    />
                    <Route
                      path="*"
                      element={<Navigate to="/dashboard" replace />}
                    />
                  </Route>
                </Routes>
                <NotificationsHost />
              </NotificationsProvider>
            </AlertsProvider>
          </RealtimeProvider>
        </BrowserRouter>
      </PermissionsProvider>
    </ThemeProvider>
  );
};

export default App;
