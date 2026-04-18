import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import OperationsPage from "./pages/OperationsPage";
import MachineDetailsPage from "./pages/MachineDetailsPage";

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<OperationsPage />} />
        <Route
          path="/machines/:machineName"
          element={<MachineDetailsPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
