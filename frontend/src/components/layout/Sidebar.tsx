import {
  Activity,
  AlertTriangle,
  BarChart3,
  Factory,
  FileText,
  Gauge,
  LayoutDashboard,
  Settings,
  Wrench,
} from "lucide-react";

import { NavLink } from "react-router-dom";

const navItems = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Machines",
    path: "/machines",
    icon: Wrench,
  },
  {
    name: "Inspections",
    path: "/inspections",
    icon: Activity,
  },
  {
    name: "Sensors",
    path: "/sensors",
    icon: Gauge,
  },
  {
    name: "Analytics",
    path: "/analytics",
    icon: BarChart3,
  },
  {
    name: "Alerts",
    path: "/alerts",
    icon: AlertTriangle,
  },
  {
    name: "Reports",
    path: "/reports",
    icon: FileText,
  },
  {
    name: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

function Sidebar() {
  return (
    <aside className="hidden w-64 border-r border-slate-800 bg-slate-900 md:flex md:flex-col">
      
      {/* Logo / Project name */}
      <div className="border-b border-slate-800 p-5">
        <div className="flex items-center gap-3">
          
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Factory className="h-5 w-5" />
          </div>

          <div>
            <h1 className="font-semibold">
              Manufacturing AI
            </h1>

            <p className="text-xs text-slate-400">
              Edge Intelligence
            </p>
          </div>

        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {item.name}
            </NavLink>
          );
        })}

      </nav>

      {/* System status */}
      <div className="border-t border-slate-800 p-4">
        <div className="rounded-lg bg-slate-800 p-3">

          <p className="text-xs text-slate-400">
            Edge AI Status
          </p>

          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <span className="text-sm">
              System Online
            </span>
          </div>

        </div>
      </div>

    </aside>
  );
}

export default Sidebar;