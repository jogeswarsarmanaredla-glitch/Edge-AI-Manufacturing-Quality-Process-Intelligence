import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  FileDown,
  RefreshCw,
  ShieldCheck,
  Activity,
  Eye,
  Cpu,
} from "lucide-react";

import {
  getAlerts,
  getAnalytics,
  getHealthScores,
  getInspections,
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
  id: number;
  name: string;
  status: string;
  score: number;
};

type HealthMachine = {
  machine_id: number;
  profile?: string;
  temperature: number;
  pressure: number;
  vibration: number;
  health_score: number;
  status: string;
};

type Inspection = {
  id: number;
  machine_id: number;
  result: string;
  confidence: number | null;
  defect_count: number;
  defect_details: string | null;
  health_score_at_inspection: number | null;
  created_at: string | null;
};

type AlertItem = {
  severity?: string;
  resolved?: boolean;
  alert_type?: string;
  message?: string;
  created_at?: string;
};

function numberValue(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleString();
}

function resultBadge(result: string) {
  const normalized = result.toLowerCase();

  if (normalized === "pass" || normalized === "healthy") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10";
  }

  if (normalized === "defect" || normalized === "fail" || normalized === "failed") {
    return "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/10";
  }

  return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/10";
}

function Reports() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [healthMachines, setHealthMachines] = useState<HealthMachine[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReport = async () => {
    try {
      setLoading(true);
      setError("");

      const [machineData, healthData, inspectionData, alertData, analyticsData] =
        await Promise.all([
          getMachines(),
          getHealthScores(),
          getInspections(),
          getAlerts(),
          getAnalytics(),
        ]);

      setMachines(Array.isArray(machineData) ? machineData : []);
      setHealthMachines(
        healthData?.status === "ok" && Array.isArray(healthData.machines)
          ? healthData.machines
          : [],
      );
      setInspections(Array.isArray(inspectionData) ? inspectionData : []);
      setAlerts(Array.isArray(alertData) ? alertData : []);
      setAnalytics(analyticsData ?? null);
    } catch (err) {
      console.error("Failed to load manufacturing report:", err);
      setError("Failed to load the manufacturing report. Check the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const summary = useMemo(() => {
    // FastAPI returns analytics as:
    // { summary: { total_readings, average_temperature, ... } }
    // Keep the fallback to analytics so the page is tolerant of
    // either shape.
    const analyticsSummary = analytics?.summary ?? analytics;

    const totalReadings = numberValue(
      analyticsSummary?.total_readings ??
        analyticsSummary?.totalReadings ??
        analyticsSummary?.reading_count,
    );

    const avgTemperature = numberValue(
      analyticsSummary?.avg_temperature ??
        analyticsSummary?.average_temperature ??
        analyticsSummary?.avgTemperature,
    );

    const avgVibration = numberValue(
      analyticsSummary?.avg_vibration ??
        analyticsSummary?.average_vibration ??
        analyticsSummary?.avgVibration,
    );

    const avgPressure = numberValue(
      analyticsSummary?.avg_pressure ??
        analyticsSummary?.average_pressure ??
        analyticsSummary?.avgPressure,
    );

    const averageHealth =
      healthMachines.length > 0
        ? healthMachines.reduce(
            (sum, item) => sum + numberValue(item.health_score),
            0,
          ) / healthMachines.length
        : 0;

    const defectCount = inspections.reduce(
      (sum, item) => sum + numberValue(item.defect_count),
      0,
    );

    const unresolvedAlerts = alerts.filter(
      (item) => item.resolved !== true,
    ).length;

    const criticalAlerts = alerts.filter(
      (item) =>
        String(item.severity ?? "").toLowerCase() === "critical" &&
        item.resolved !== true,
    ).length;

    return {
      totalReadings,
      avgTemperature,
      avgVibration,
      avgPressure,
      averageHealth,
      defectCount,
      unresolvedAlerts,
      criticalAlerts,
    };
  }, [analytics, healthMachines, inspections, alerts]);

  const printReport = () => {
    window.print();
  };

  return (
    <section className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Manufacturing Reports</h2>
          <p className="mt-1 text-sm text-slate-400">
            Consolidated machine health, sensor, AI inspection and alert summary.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadReport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            type="button"
            onClick={printReport}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
          >
            <FileDown className="h-4 w-4" />
            Export / Print
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Average Machine Health</span>
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="mt-3 text-3xl font-semibold">
              {summary.averageHealth.toFixed(1)}%
            </p>
            <p className="mt-1 text-xs text-slate-500">{healthMachines.length} machines monitored</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Sensor Readings</span>
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <p className="mt-3 text-3xl font-semibold">{summary.totalReadings}</p>
            <p className="mt-1 text-xs text-slate-500">Temperature / pressure / vibration observations</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Detected Defects</span>
              <Eye className="h-5 w-5 text-amber-400" />
            </div>
            <p className="mt-3 text-3xl font-semibold">{summary.defectCount}</p>
            <p className="mt-1 text-xs text-slate-500">{inspections.length} inspection records</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Unresolved Alerts</span>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <p className="mt-3 text-3xl font-semibold">{summary.unresolvedAlerts}</p>
            <p className="mt-1 text-xs text-slate-500">{summary.criticalAlerts} critical unresolved</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Machine Health Summary</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {loading ? (
              <p className="text-sm text-slate-500">Loading machine report...</p>
            ) : (
              machines.map((machine) => {
                const health = healthMachines.find(
                  (item) => item.machine_id === machine.id,
                );

                const score = health
                  ? numberValue(health.health_score)
                  : numberValue(machine.score);

                return (
                  <div
                    key={machine.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4"
                  >
                    <div>
                      <p className="font-medium text-white">{machine.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Machine ID: {machine.id}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-white">{score.toFixed(1)}%</p>
                      <p className="text-xs text-slate-500">
                        {health?.status ?? machine.status}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader>
            <CardTitle>Sensor Summary</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs text-slate-500">Avg Temperature</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {summary.avgTemperature.toFixed(1)}°C
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs text-slate-500">Avg Pressure</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {summary.avgPressure.toFixed(2)} bar
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                <p className="text-xs text-slate-500">Avg Vibration</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {summary.avgVibration.toFixed(2)} mm/s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900 text-white">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Recent AI Inspections</CardTitle>
            <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/10">
              {inspections.length} records
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {inspections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 p-8 text-center text-sm text-slate-500">
              No inspection records available.
            </div>
          ) : (
            <div className="space-y-3">
              {inspections.slice(0, 8).map((inspection) => (
                <div
                  key={inspection.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-white">
                        Inspection #{inspection.id}
                      </p>
                      <Badge className={resultBadge(inspection.result)}>
                        {inspection.result}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(inspection.created_at)}
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {inspection.defect_details ?? "No defect details available."}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-5 text-xs">
                    <div>
                      <p className="text-slate-500">Confidence</p>
                      <p className="mt-1 font-medium text-slate-200">
                        {inspection.confidence !== null
                          ? `${inspection.confidence.toFixed(1)}%`
                          : "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Defects</p>
                      <p className="mt-1 font-medium text-slate-200">
                        {inspection.defect_count}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-500">Health at inspection</p>
                      <p className="mt-1 font-medium text-slate-200">
                        {inspection.health_score_at_inspection !== null
                          ? `${inspection.health_score_at_inspection.toFixed(1)}%`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-900/50 bg-blue-950/20 text-white">
        <CardContent className="flex items-start gap-3 p-5">
          <Cpu className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
          <div>
            <p className="text-sm font-medium">Edge AI deployment target</p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              The inspection pipeline is designed around an open-source YOLO model and can be
              optimized for a Snapdragon-powered HP PC as the target Edge AI deployment platform.
            </p>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @media print {
          body {
            background: white !important;
          }
          aside,
          nav,
          button {
            display: none !important;
          }
        }
      `}</style>
    </section>
  );
}

export default Reports;
