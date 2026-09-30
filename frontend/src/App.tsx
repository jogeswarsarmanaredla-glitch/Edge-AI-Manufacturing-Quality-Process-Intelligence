import {
  HashRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import FactoryLayout from "@/components/layout/FactoryLayout";

import Dashboard from "@/pages/Dashboard";
import Machines from "@/pages/Machines";
import Inspections from "@/pages/Inspections";
import Sensors from "@/pages/Sensors";
import Analytics from "@/pages/Analytics";
import Alerts from "@/pages/Alerts";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";

function App() {
  return (
    <HashRouter>
      <Routes>

        {/* Shared layout */}
        <Route element={<FactoryLayout />}>

          {/* Home → Dashboard */}
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          {/* Pages */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/machines" element={<Machines />} />
          <Route path="/inspections" element={<Inspections />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />

        </Route>

      </Routes>
    </HashRouter>
  );
}

export default App;
