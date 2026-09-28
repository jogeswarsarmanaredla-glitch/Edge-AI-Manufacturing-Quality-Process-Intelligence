import { useEffect, useState } from "react";

import {
  Activity,
  Bell,
  CheckCircle2,
  Cpu,
  Database,
  Eye,
  RefreshCw,
  Server,
  ShieldCheck,
  Thermometer,
  Gauge,
  Waves,
} from "lucide-react";

import { checkBackendHealth } from "@/services/api";

import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

function Settings() {
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "offline"
  >("checking");

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState(false);

  const checkConnection = async () => {
    try {
      setBackendStatus("checking");
      const response = await checkBackendHealth();

      setBackendStatus(response?.status === "ok" ? "connected" : "offline");
    } catch {
      setBackendStatus("offline");
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const statusLabel =
    backendStatus === "connected"
      ? "Connected"
      : backendStatus === "offline"
        ? "Offline"
        : "Checking";

  const statusClasses =
    backendStatus === "connected"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10"
      : backendStatus === "offline"
        ? "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/10"
        : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/10";

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">
            System Settings
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Configure monitoring behavior, AI modules and deployment information.
          </p>
        </div>

        <button
          type="button"
          onClick={checkConnection}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              backendStatus === "checking" ? "animate-spin" : ""
            }`}
          />
          Check Backend
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Server className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Backend API</p>
                <p className="text-xs text-slate-500">FastAPI</p>
              </div>
            </div>

            <Badge className={`mt-4 ${statusClasses}`}>{statusLabel}</Badge>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-violet-500/10 p-2">
                <Database className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Data Layer</p>
                <p className="text-xs text-slate-500">PostgreSQL</p>
              </div>
            </div>

            <Badge className="mt-4 border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10">
              Configured
            </Badge>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-cyan-500/10 p-2">
                <Cpu className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-sm font-medium">Edge AI Target</p>
                <p className="text-xs text-slate-500">Snapdragon-powered HP PC</p>
              </div>
            </div>

            <Badge className="mt-4 border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/10">
              Target Platform
            </Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Monitoring</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium">Auto-refresh</p>
                  <p className="text-xs text-slate-500">
                    Refresh live machine health every 10 seconds.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAutoRefresh((current) => !current)}
                className={`h-6 w-11 rounded-full p-1 transition ${
                  autoRefresh ? "bg-blue-600" : "bg-slate-700"
                }`}
                aria-label="Toggle auto-refresh"
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition ${
                    autoRefresh ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-orange-400" />
                  <span className="text-xs text-slate-400">Temperature</span>
                </div>
                <p className="mt-2 text-sm font-medium text-white">
                  Enabled
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-slate-400">Pressure</span>
                </div>
                <p className="mt-2 text-sm font-medium text-white">
                  Enabled
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <div className="flex items-center gap-2">
                  <Waves className="h-4 w-4 text-sky-400" />
                  <span className="text-xs text-slate-400">Vibration</span>
                </div>
                <p className="mt-2 text-sm font-medium text-white">
                  Enabled
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-amber-400" />
                <div>
                  <p className="text-sm font-medium">Email notifications</p>
                  <p className="text-xs text-slate-500">
                    UI preference only; external email delivery is not connected.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEmailAlerts((current) => !current)}
                className={`h-6 w-11 rounded-full p-1 transition ${
                  emailAlerts ? "bg-blue-600" : "bg-slate-700"
                }`}
                aria-label="Toggle email notifications"
              >
                <span
                  className={`block h-4 w-4 rounded-full bg-white transition ${
                    emailAlerts ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm font-medium">Alerting engine</p>
                  <p className="text-xs text-slate-500">
                    Sensor-based alerts and AI anomaly records are connected to the backend.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900 text-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>AI Configuration</CardTitle>
            <button
              type="button"
              onClick={() => setExpandedDetails((current) => !current)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
            >
              {expandedDetails ? "Hide Details" : "Show Details"}
            </button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs text-slate-500">Vision Model</p>
              <p className="mt-1 font-medium text-white">YOLO11n</p>
              <p className="mt-1 text-xs text-slate-500">Surface defect detection</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs text-slate-500">Anomaly Model</p>
              <p className="mt-1 font-medium text-white">Isolation Forest</p>
              <p className="mt-1 text-xs text-slate-500">Multi-sensor anomaly detection</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs text-slate-500">CV Inference</p>
              <p className="mt-1 font-medium text-white">0.28</p>
              <p className="mt-1 text-xs text-slate-500">Current inference threshold</p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs text-slate-500">Defect Confirmation</p>
              <p className="mt-1 font-medium text-white">0.50</p>
              <p className="mt-1 text-xs text-slate-500">Application interpretation rule</p>
            </div>
          </div>

          {expandedDetails && (
            <div className="rounded-xl border border-blue-900/50 bg-blue-950/20 p-4">
              <div className="flex items-start gap-3">
                <Cpu className="mt-0.5 h-5 w-5 text-blue-400" />
                <div>
                  <p className="text-sm font-medium text-white">
                    Snapdragon deployment target
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    The project is structured so the computer-vision inference workload can be
                    optimized for a Snapdragon-powered HP PC using a Qualcomm Edge AI deployment path.
                    This page describes the target configuration; it does not claim that the current
                    AMD development machine is running the Snapdragon NPU.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <div>
                <p className="text-sm font-medium text-white">
                  Production monitoring stack configured
                </p>
                <p className="text-xs text-slate-500">
                  React + FastAPI + PostgreSQL + sensor anomaly detection + CV inspection.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default Settings;
