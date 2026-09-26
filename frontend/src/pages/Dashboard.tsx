import { useEffect, useState } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Factory,
  ShieldAlert,
  Wrench,
} from "lucide-react";

import {
  checkBackendHealth,
  getMachines,
} from "@/services/api";

import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Machine = {
  name: string;
  status: string;
  score: string;
};

function Dashboard() {
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "offline"
  >("checking");

  const [machines, setMachines] = useState<Machine[]>([]);

  useEffect(() => {
    // Check backend connection
    checkBackendHealth()
      .then(() => {
        setBackendStatus("connected");
      })
      .catch(() => {
        setBackendStatus("offline");
      });

    // Fetch machines from FastAPI
    getMachines()
      .then((data) => {
        setMachines(data);
      })
      .catch((error) => {
        console.error("Failed to load machines:", error);
      });
  }, []);

  return (
    <section className="space-y-6 p-6">

      {/* Page introduction */}
      <div>
        <h3 className="text-lg font-semibold">
          Factory Overview
        </h3>

        <p className="text-sm text-slate-400">
          Monitor machines, inspections, sensors and AI-driven
          quality insights.
        </p>
      </div>

      {/* Backend connection status */}
      <Card className="border-slate-800 bg-slate-900 text-white">
        <CardContent className="flex items-center justify-between p-4">

          <div>
            <p className="text-sm text-slate-400">
              Backend Status
            </p>

            <p className="mt-1 font-semibold">
              {backendStatus === "checking" && "Checking..."}
              {backendStatus === "connected" && "Connected"}
              {backendStatus === "offline" && "Offline"}
            </p>
          </div>

          <div
            className={`h-3 w-3 rounded-full ${
              backendStatus === "connected"
                ? "bg-emerald-500"
                : backendStatus === "offline"
                  ? "bg-red-500"
                  : "bg-amber-500"
            }`}
          />

        </CardContent>
      </Card>

      {/* KPI CARDS */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Machines Online */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Machines Online
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-end justify-between">

              <div>
                <p className="text-3xl font-bold">
                  {machines.length}
                </p>

                <p className="mt-1 text-xs text-emerald-400">
                  {machines.filter(
                    (machine) => machine.status === "Running"
                  ).length}{" "}
                  running normally
                </p>
              </div>

              <div className="rounded-lg bg-blue-500/10 p-2">
                <Factory className="h-5 w-5 text-blue-400" />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Quality Score */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Quality Score
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-end justify-between">

              <div>
                <p className="text-3xl font-bold">
                  96.8%
                </p>

                <p className="mt-1 text-xs text-emerald-400">
                  Stable
                </p>
              </div>

              <div className="rounded-lg bg-emerald-500/10 p-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Defects */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Defects Today
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-end justify-between">

              <div>
                <p className="text-3xl font-bold">
                  17
                </p>

                <p className="mt-1 text-xs text-amber-400">
                  3 need inspection
                </p>
              </div>

              <div className="rounded-lg bg-amber-500/10 p-2">
                <ShieldAlert className="h-5 w-5 text-amber-400" />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Active Alerts
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-end justify-between">

              <div>
                <p className="text-3xl font-bold">
                  3
                </p>

                <p className="mt-1 text-xs text-red-400">
                  1 critical
                </p>
              </div>

              <div className="rounded-lg bg-red-500/10 p-2">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>

            </div>
          </CardContent>
        </Card>

      </div>

      {/* MACHINE OVERVIEW + AI INSIGHT */}
      <div className="grid gap-6 xl:grid-cols-3">

        {/* Machine Overview */}
        <Card className="border-slate-800 bg-slate-900 text-white xl:col-span-2">

          <CardHeader>
            <div className="flex items-center justify-between">

              <CardTitle>
                Machine Overview
              </CardTitle>

              <Badge variant="outline">
                Live
              </Badge>

            </div>
          </CardHeader>

          <CardContent>
            <div className="space-y-3">

              {machines.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                  Loading machine data...
                </div>
              ) : (
                machines.map((machine) => (
                  <div
                    key={machine.name}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >

                    <div className="flex items-center gap-3">

                      <div className="rounded-lg bg-slate-800 p-2">
                        <Wrench className="h-4 w-4 text-slate-300" />
                      </div>

                      <div>
                        <p className="font-medium">
                          {machine.name}
                        </p>

                        <p className="text-xs text-slate-400">
                          Quality Score: {machine.score}
                        </p>
                      </div>

                    </div>

                    <Badge
                      variant={
                        machine.status === "Critical"
                          ? "destructive"
                          : machine.status === "Warning"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {machine.status}
                    </Badge>

                  </div>
                ))
              )}

            </div>
          </CardContent>

        </Card>

        {/* AI Insight */}
        <Card className="border-blue-900/50 bg-linear-to-b from-blue-950/40 to-slate-900 text-white">

          <CardHeader>
            <CardTitle>
              AI Insight
            </CardTitle>
          </CardHeader>

          <CardContent>

            <div className="rounded-xl border border-blue-900/50 bg-blue-950/30 p-4">

              <div className="mb-3 flex items-center gap-2">

                <div className="h-2 w-2 rounded-full bg-blue-400" />

                <span className="text-xs font-medium text-blue-300">
                  EDGE AI ANALYSIS
                </span>

              </div>

              <p className="text-sm leading-6 text-slate-300">
                Machine 02 is showing abnormal operating conditions.
                Increased vibration has been detected compared with
                its recent baseline.
              </p>

              <div className="mt-4 flex items-center gap-2 text-xs text-amber-400">
                <Activity className="h-4 w-4" />
                Inspection recommended
              </div>

            </div>

          </CardContent>

        </Card>

      </div>

    </section>
  );
}

export default Dashboard;