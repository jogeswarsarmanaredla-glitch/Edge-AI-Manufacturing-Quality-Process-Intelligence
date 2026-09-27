import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Factory,
  Gauge,
  RefreshCw,
  Thermometer,
  Waves,
} from "lucide-react";

import {
  getAlerts,
  getInspections,
  getMachineInsights,
  getMachines,
  getSensors,
} from "@/services/api";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";


// ============================================================
// TYPES
// ============================================================

type Machine = {
  id: number;
  name: string;
  status: string;
  score: number;
};

type SensorReading = {
  id: number;
  machine_id: number;
  sensor_type: string;
  value: number;
  unit: string;
  recorded_at: string;
};

type Alert = {
  id: number;
  machine_id: number;
  alert_type: string;
  severity: string;
  message: string;
  resolved: boolean;
  created_at: string;
};

type Inspection = {
  id: number;
  machine_id: number;
  result: string;
  confidence?: number | null;
  defect_count?: number;
  created_at: string;
};

type MachineInsight = {
  machine_id: number;
  health_score: number;
  health_status: string;

  sensor_scores?: {
    temperature?: number;
    pressure?: number;
    vibration?: number;
  };

  anomaly_detected: boolean;
  anomaly_score?: number;
  history_count?: number;

  combined_status: string;
  explanation: string;
  recommended_action: string;
  recorded_at?: string;
};


// ============================================================
// STATUS BADGE
// ============================================================

function getStatusBadge(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("healthy") ||
    normalized.includes("running")
  ) {
    return (
      <Badge className="border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/10">
        Healthy
      </Badge>
    );
  }

  if (
    normalized.includes("monitor") ||
    normalized.includes("warning")
  ) {
    return (
      <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/10">
        Monitor
      </Badge>
    );
  }

  return (
    <Badge className="border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/10">
      Inspection Recommended
    </Badge>
  );
}


// ============================================================
// PRIORITY
// ============================================================

function getInsightPriority(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("high")) return 4;
  if (normalized.includes("inspection")) return 3;
  if (normalized.includes("monitor")) return 2;

  return 1;
}


// ============================================================
// TODAY
// ============================================================

function getTodayStart() {
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
}


// ============================================================
// DASHBOARD
// ============================================================

function Dashboard() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [machineInsights, setMachineInsights] = useState<
    MachineInsight[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);


  // ==========================================================
  // LOAD LIVE DATA
  // ==========================================================

  const loadDashboard = async () => {
    try {
      setRefreshing(true);
      setError(null);

      const [
        machinesData,
        sensorsData,
        alertsData,
        inspectionsData,
        machineInsightsData,
      ] = await Promise.all([
        getMachines(),
        getSensors(),
        getAlerts(),
        getInspections(),
        getMachineInsights(),
      ]);

      setMachines(
        Array.isArray(machinesData)
          ? machinesData
          : []
      );

      setSensors(
        Array.isArray(sensorsData)
          ? sensorsData
          : []
      );

      setAlerts(
        Array.isArray(alertsData)
          ? alertsData
          : []
      );

      setInspections(
        Array.isArray(inspectionsData)
          ? inspectionsData
          : []
      );

      setMachineInsights(
        Array.isArray(machineInsightsData?.machines)
          ? machineInsightsData.machines
          : []
      );

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(
        "Unable to load live dashboard data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    loadDashboard();

    const interval = setInterval(() => {
      loadDashboard();
    }, 10000);

    return () => clearInterval(interval);
  }, []);


  // ==========================================================
  // MACHINE INSIGHT MAP
  // ==========================================================

  const machineInsightMap = useMemo(() => {
    const map = new Map<number, MachineInsight>();

    machineInsights.forEach((item) => {
      map.set(item.machine_id, item);
    });

    return map;
  }, [machineInsights]);


  // ==========================================================
  // LATEST SENSOR VALUES
  // ==========================================================

  const latestSensorMap = useMemo(() => {
    const map = new Map<
      number,
      {
        temperature?: number;
        pressure?: number;
        vibration?: number;
      }
    >();

    const sortedSensors = [...sensors].sort(
      (a, b) =>
        new Date(b.recorded_at).getTime() -
        new Date(a.recorded_at).getTime()
    );

    for (const sensor of sortedSensors) {
      if (!map.has(sensor.machine_id)) {
        map.set(sensor.machine_id, {});
      }

      const machineSensor =
        map.get(sensor.machine_id)!;

      const sensorType =
        sensor.sensor_type.toLowerCase();

      if (
        sensorType.includes("temperature") &&
        machineSensor.temperature === undefined
      ) {
        machineSensor.temperature =
          Number(sensor.value);
      }

      if (
        sensorType.includes("pressure") &&
        machineSensor.pressure === undefined
      ) {
        machineSensor.pressure =
          Number(sensor.value);
      }

      if (
        sensorType.includes("vibration") &&
        machineSensor.vibration === undefined
      ) {
        machineSensor.vibration =
          Number(sensor.value);
      }
    }

    return map;
  }, [sensors]);


  // ==========================================================
  // OVERALL HEALTH
  // ==========================================================

  const overallHealthScore = useMemo(() => {
    if (machineInsights.length === 0) {
      return 0;
    }

    const total = machineInsights.reduce(
      (sum, machine) =>
        sum + Number(machine.health_score || 0),
      0
    );

    return (
      total / machineInsights.length
    );
  }, [machineInsights]);


  // ==========================================================
  // ACTIVE ALERTS
  // ==========================================================

  const unresolvedAlerts = useMemo(() => {
    return alerts.filter(
      (alert) => !alert.resolved
    );
  }, [alerts]);


  const criticalAlerts = useMemo(() => {
    return unresolvedAlerts.filter(
      (alert) =>
        alert.severity?.toLowerCase() ===
        "critical"
    );
  }, [unresolvedAlerts]);


  // ==========================================================
  // DEFECTS TODAY
  // ==========================================================

  const defectsToday = useMemo(() => {
    const todayStart = getTodayStart();

    return inspections.reduce(
      (total, inspection) => {
        const created = new Date(
          inspection.created_at
        );

        if (
          created >= todayStart &&
          inspection.result?.toLowerCase() ===
            "defect"
        ) {
          return (
            total +
            Number(
              inspection.defect_count || 1
            )
          );
        }

        return total;
      },
      0
    );
  }, [inspections]);


  // ==========================================================
  // PRIMARY AI INSIGHT
  // ==========================================================

  const primaryInsight = useMemo(() => {
    if (machineInsights.length === 0) {
      return null;
    }

    return [...machineInsights].sort(
      (a, b) =>
        getInsightPriority(
          b.combined_status
        ) -
        getInsightPriority(
          a.combined_status
        )
    )[0];
  }, [machineInsights]);


  // ==========================================================
  // MACHINE CARDS
  // ==========================================================

  const machineCards = useMemo(() => {
    return machines.map((machine) => {
      const insight =
        machineInsightMap.get(machine.id);

      const sensor =
        latestSensorMap.get(machine.id);

      return {
        machine,
        insight,
        sensor,
      };
    });
  }, [
    machines,
    machineInsightMap,
    latestSensorMap,
  ]);


  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-[#050b18] text-white">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-400" />

          <p className="text-sm text-slate-400">
            Loading live manufacturing data...
          </p>
        </div>
      </div>
    );
  }


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="space-y-6 bg-transparent text-white">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Manufacturing AI Dashboard
          </h1>

          <p className="mt-1 text-slate-400">
            Live machine condition, anomaly detection
            and predictive-maintenance monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">

          {lastUpdated && (
            <span className="text-xs text-slate-500">
              Updated{" "}
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}

          <button
            onClick={loadDashboard}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-[#101827] px-3 py-2 text-sm text-slate-200 transition hover:bg-[#172235] disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing
                  ? "animate-spin"
                  : ""
              }`}
            />

            Refresh
          </button>
        </div>
      </div>


      {/* ====================================================== */}
      {/* ERROR */}
      {/* ====================================================== */}

      {error && (
        <Card className="border-red-500/30 bg-[#111827] text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-5 w-5" />

              <div>
                <p className="font-medium">
                  Dashboard data unavailable
                </p>

                <p className="text-sm text-slate-400">
                  {error}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {/* ====================================================== */}
      {/* KPI CARDS */}
      {/* ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        {/* Overall Machine Health */}

        <Card className="border-slate-800 bg-[#111827] text-white shadow-lg shadow-black/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Overall Machine Health
            </CardTitle>

            <Gauge className="h-5 w-5 text-blue-400" />
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {overallHealthScore.toFixed(1)}%
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Live combined AI health score
            </p>
          </CardContent>
        </Card>


        {/* Machines Online */}

        <Card className="border-slate-800 bg-[#111827] text-white shadow-lg shadow-black/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Machines Online
            </CardTitle>

            <Factory className="h-5 w-5 text-blue-400" />
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {
                machines.filter((machine) => {
                  const insight =
                    machineInsightMap.get(
                      machine.id
                    );

                  return (
                    !insight ||
                    !insight.combined_status
                      .toLowerCase()
                      .includes("high")
                  );
                }).length
              }

              <span className="text-lg text-slate-500">
                /{machines.length}
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Connected production machines
            </p>
          </CardContent>
        </Card>


        {/* Defects Today */}

        <Card className="border-slate-800 bg-[#111827] text-white shadow-lg shadow-black/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Defects Today
            </CardTitle>

            <CheckCircle2 className="h-5 w-5 text-blue-400" />
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {defectsToday}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Based on completed AI inspections
            </p>
          </CardContent>
        </Card>


        {/* Active Alerts */}

        <Card className="border-slate-800 bg-[#111827] text-white shadow-lg shadow-black/10">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">
              Active Alerts
            </CardTitle>

            <AlertTriangle className="h-5 w-5 text-red-400" />
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {unresolvedAlerts.length}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              {criticalAlerts.length} critical unresolved
            </p>
          </CardContent>
        </Card>

      </div>


      {/* ====================================================== */}
      {/* LIVE MACHINE CONDITION */}
      {/* ====================================================== */}

      <Card className="border-slate-800 bg-[#111827] text-white shadow-lg shadow-black/10">

        <CardHeader>
          <CardTitle className="text-white">
            Live Machine Condition
          </CardTitle>
        </CardHeader>

        <CardContent>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

            {machineCards.map(
              ({
                machine,
                insight,
                sensor,
              }) => {

                const healthScore =
                  insight?.health_score ?? 0;

                const status =
                  insight?.combined_status ||
                  "Unknown";

                return (
                  <div
                    key={machine.id}
                    className="space-y-4 rounded-xl border border-slate-800 bg-[#0d1625] p-4 transition hover:border-slate-700"
                  >

                    {/* Machine Header */}

                    <div className="flex items-start justify-between gap-3">

                      <div>
                        <p className="font-semibold text-white">
                          {machine.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          Machine ID: {machine.id}
                        </p>
                      </div>

                      {getStatusBadge(status)}

                    </div>


                    {/* Health Score */}

                    <div>

                      <div className="flex items-end justify-between">

                        <span className="text-sm text-slate-400">
                          AI Health Score
                        </span>

                        <span className="text-2xl font-bold text-white">
                          {healthScore.toFixed(1)}%
                        </span>

                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">

                        <div
                          className="h-full rounded-full bg-blue-500 transition-all duration-500"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                healthScore,
                                100
                              )
                            )}%`,
                          }}
                        />

                      </div>
                    </div>


                    {/* Sensor Values */}

                    <div className="grid grid-cols-3 gap-2">

                      <div className="rounded-lg border border-slate-800 bg-[#111c2d] p-2">

                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Thermometer className="h-3.5 w-3.5" />
                          Temp
                        </div>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {sensor?.temperature !==
                          undefined
                            ? `${sensor.temperature.toFixed(
                                1
                              )} °C`
                            : "--"}
                        </p>

                      </div>


                      <div className="rounded-lg border border-slate-800 bg-[#111c2d] p-2">

                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Gauge className="h-3.5 w-3.5" />
                          Pressure
                        </div>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {sensor?.pressure !==
                          undefined
                            ? `${sensor.pressure.toFixed(
                                1
                              )} bar`
                            : "--"}
                        </p>

                      </div>


                      <div className="rounded-lg border border-slate-800 bg-[#111c2d] p-2">

                        <div className="flex items-center gap-1 text-xs text-slate-500">
                          <Waves className="h-3.5 w-3.5" />
                          Vibration
                        </div>

                        <p className="mt-1 text-sm font-semibold text-white">
                          {sensor?.vibration !==
                          undefined
                            ? `${sensor.vibration.toFixed(
                                2
                              )} mm/s`
                            : "--"}
                        </p>

                      </div>

                    </div>


                    {/* AI CONDITION */}

                    <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">

                      <div className="flex items-center gap-2">

                        <Activity className="h-4 w-4 text-blue-400" />

                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                          AI Condition
                        </span>

                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-300">
                        {insight?.explanation ||
                          "Waiting for AI analysis."}
                      </p>

                    </div>

                  </div>
                );
              }
            )}

          </div>

        </CardContent>
      </Card>


      {/* ====================================================== */}
      {/* AI INSIGHT */}
      {/* ====================================================== */}

      <Card className="border-slate-800 bg-[#111827] text-white shadow-lg shadow-black/10">

        <CardHeader>

          <CardTitle className="flex items-center gap-2 text-white">

            <Activity className="h-5 w-5 text-blue-400" />

            AI Insight

          </CardTitle>

        </CardHeader>

        <CardContent>

          {primaryInsight ? (

            <div className="rounded-xl border border-slate-800 bg-[#0d1625] p-5">

              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">

                <div>

                  <p className="text-sm text-slate-500">
                    Machine{" "}
                    {primaryInsight.machine_id}
                  </p>

                  <h3 className="mt-1 text-xl font-semibold text-white">
                    {primaryInsight.combined_status}
                  </h3>

                </div>


                <div className="flex items-center gap-2">

                  {primaryInsight.anomaly_detected ? (

                    <Badge className="border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/10">
                      AI Anomaly Detected
                    </Badge>

                  ) : (

                    <Badge className="border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/10">
                      No Anomaly Detected
                    </Badge>

                  )}

                </div>

              </div>


              <div className="mt-5 grid gap-4 md:grid-cols-3">

                <div className="rounded-lg border border-slate-800 bg-[#111c2d] p-4">

                  <p className="text-xs text-slate-500">
                    Health Score
                  </p>

                  <p className="mt-1 text-2xl font-bold text-white">
                    {Number(
                      primaryInsight.health_score
                    ).toFixed(1)}
                    %
                  </p>

                </div>


                <div className="rounded-lg border border-slate-800 bg-[#111c2d] p-4">

                  <p className="text-xs text-slate-500">
                    AI Analysis
                  </p>

                  <p className="mt-1 text-sm font-medium leading-6 text-slate-300">
                    {primaryInsight.explanation}
                  </p>

                </div>


                <div className="rounded-lg border border-slate-800 bg-[#111c2d] p-4">

                  <p className="text-xs text-slate-500">
                    Recommended Action
                  </p>

                  <p className="mt-1 text-sm font-medium leading-6 text-slate-300">
                    {primaryInsight.recommended_action}
                  </p>

                </div>

              </div>

            </div>

          ) : (

            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-[#0d1625] p-4 text-slate-400">

              <Activity className="h-5 w-5 text-blue-400" />

              <p>
                Waiting for combined AI machine analysis...
              </p>

            </div>

          )}

        </CardContent>

      </Card>

    </div>
  );
}

export default Dashboard;