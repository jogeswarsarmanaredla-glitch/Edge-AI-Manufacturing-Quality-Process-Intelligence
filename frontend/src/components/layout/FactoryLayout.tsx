import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

function FactoryLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="flex min-h-screen">
        
        {/* Left navigation */}
        <Sidebar />

        {/* Main application area */}
        <main className="flex-1">
          
          {/* Top header */}
          <Header />

          {/* Current page appears here */}
          <div>
            <Outlet />
          </div>

        </main>
      </div>
    </div>
  );
}

export default FactoryLayout;