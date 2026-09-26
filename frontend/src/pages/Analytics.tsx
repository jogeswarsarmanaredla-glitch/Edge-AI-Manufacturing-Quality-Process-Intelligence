import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Gauge,
  RefreshCw,
  Sparkles,
  Thermometer,
  Waves,
  Wind,
} from "lucide-react";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  getAnalytics,
  getAlerts,
  getSensors,
  runAIAnalysis,
} from "../services/api";

import { Badge } from "../components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";


// ============================================================
// TYPES
// ============================================================

type MachineAnalytics = {
  id: number;
  name: string;
  status: string;
  score: number;
  temperature: number | null;
  vibration: number | null;
  pressure: number | null;
  alert_count: number;
};

type AnalyticsData = {
  summary: {
    total_readings: number;
    average_temperature: number | null;
    average_vibration: number | null;
    average_pressure: number | null;
  };

  alerts: {
    total: number;
    critical: number;
    warning: number;
    unresolved: number;
  };

  machines: MachineAnalytics[];
};

type SensorReading = {
  id: number;
  machine_id: number;
  sensor_type: string;
  value: number;
  unit: string;
  recorded_at: string | null;
};

type AlertRecord = {
  id: number;
  machine_id: number;
  sensor_type: string;
  alert_type: string;
  severity: string;
  message: string;
  value: number | null;
  unit: string | null;
  created_at: string | null;
  resolved: boolean;
};

type AIAnomaly = {
  id: number;
  machine_id: number;
  sensor_type: string;
  severity: string;
  message: string;
  anomaly_score: number | null;
  created_at: string | null;
};

type AIAnalysisResponse = {
  status: string;
  message: string;
  anomalies_detected?: number;
  anomalies?: AIAnomaly[];
};

type TrendPoint = {
  time: string;
  timestamp: number;
  temperature?: number;
  vibration?: number;
  pressure?: number;
};


// ============================================================
// TOOLTIP STYLE
// ============================================================

const tooltipContentStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#ffffff",
};

const tooltipLabelStyle = {
  color: "#94a3b8",
};

const tooltipItemStyle = {
  color: "#ffffff",
};


// ============================================================
// ANALYTICS
// ============================================================

function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);

  const [sensors, setSensors] = useState<SensorReading[]>([]);

  const [aiResults, setAIResults] = useState<AIAnomaly[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [aiRunning, setAIRunning] = useState(false);

  const [aiMessage, setAIMessage] = useState("");

  const [lastAIStatus, setLastAIStatus] = useState<
    "ready" | "success" | "error"
  >("ready");


  // ============================================================
  // LOAD ANALYTICS + SENSORS + EXISTING AI RESULTS
  // ============================================================

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError("");

      const [
        analyticsResult,
        sensorResult,
        alertResult,
      ] = await Promise.all([
        getAnalytics(),
        getSensors(),
        getAlerts(),
      ]);

      setData(analyticsResult);

      setSensors(sensorResult);

      const existingAIResults: AIAnomaly[] =
        (alertResult as AlertRecord[])
          .filter(
            (alert) =>
              alert.alert_type === "AI Anomaly",
          )
          .slice(0, 10)
          .map((alert) => ({
            id: alert.id,
            machine_id: alert.machine_id,
            sensor_type: alert.sensor_type,
            severity: alert.severity,
            message: alert.message,
            anomaly_score: alert.value,
            created_at: alert.created_at,
          }));

      setAIResults(existingAIResults);
    } catch (err) {
      console.error(
        "Analytics loading error:",
        err,
      );

      setError(
        "Failed to load analytics data.",
      );
    } finally {
      setLoading(false);
    }
  }


  // ============================================================
  // RUN AI ANALYSIS
  // ============================================================

  async function handleAIAnalysis() {
    try {
      setAIRunning(true);

      setAIMessage("");

      setLastAIStatus("ready");

      const result =
        (await runAIAnalysis()) as AIAnalysisResponse;

      if (result.status !== "ok") {
        throw new Error(
          result.message ||
            "AI analysis failed",
        );
      }

      setLastAIStatus("success");

      setAIMessage(
        `AI analysis completed successfully. ${
          result.anomalies_detected ?? 0
        } anomalies detected.`,
      );

      if (result.anomalies) {
        setAIResults(result.anomalies);
      }

      await loadAnalytics();
    } catch (err) {
      console.error(
        "AI analysis error:",
        err,
      );

      setLastAIStatus("error");

      setAIMessage(
        "AI analysis failed. Please check the backend and try again.",
      );
    } finally {
      setAIRunning(false);
    }
  }


  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadAnalytics();
  }, []);


  // ============================================================
  // BUILD TREND DATA
  // ============================================================

  const trendData = useMemo<TrendPoint[]>(
    () => {
      const grouped = new Map<
        number,
        {
          timestamp: number;
          temperatureValues: number[];
          vibrationValues: number[];
          pressureValues: number[];
        }
      >();

      for (const sensor of sensors) {
        if (!sensor.recorded_at) {
          continue;
        }

        const timestamp = new Date(
          sensor.recorded_at,
        ).getTime();

        if (!grouped.has(timestamp)) {
          grouped.set(timestamp, {
            timestamp,
            temperatureValues: [],
            vibrationValues: [],
            pressureValues: [],
          });
        }

        const point =
          grouped.get(timestamp)!;

        if (
          sensor.sensor_type ===
          "Temperature"
        ) {
          point.temperatureValues.push(
            sensor.value,
          );
        }

        if (
          sensor.sensor_type ===
          "Vibration"
        ) {
          point.vibrationValues.push(
            sensor.value,
          );
        }

        if (
          sensor.sensor_type ===
          "Pressure"
        ) {
          point.pressureValues.push(
            sensor.value,
          );
        }
      }

      return Array.from(
        grouped.values(),
      )
        .sort(
          (a, b) =>
            a.timestamp - b.timestamp,
        )
        .map((point) => ({
          timestamp: point.timestamp,

          time: new Date(
            point.timestamp,
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),

          temperature:
            point.temperatureValues.length >
            0
              ? Number(
                  (
                    point.temperatureValues.reduce(
                      (sum, value) =>
                        sum + value,
                      0,
                    ) /
                    point
                      .temperatureValues
                      .length
                  ).toFixed(2),
                )
              : undefined,

          vibration:
            point.vibrationValues.length >
            0
              ? Number(
                  (
                    point.vibrationValues.reduce(
                      (sum, value) =>
                        sum + value,
                      0,
                    ) /
                    point
                      .vibrationValues
                      .length
                  ).toFixed(2),
                )
              : undefined,

          pressure:
            point.pressureValues.length >
            0
              ? Number(
                  (
                    point.pressureValues.reduce(
                      (sum, value) =>
                        sum + value,
                      0,
                    ) /
                    point
                      .pressureValues
                      .length
                  ).toFixed(2),
                )
              : undefined,
        }));
    },
    [sensors],
  );


  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-100 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <RefreshCw className="h-5 w-5 animate-spin" />

          Loading analytics...
        </div>
      </div>
    );
  }


  // ============================================================
  // ERROR STATE
  // ============================================================

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-red-400" />

          <div>
            <h2 className="font-semibold text-white">
              Analytics unavailable
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              {error ||
                "No analytics data available."}
            </p>
          </div>
        </div>

        <button
          onClick={loadAnalytics}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white transition hover:bg-slate-700"
        >
          <RefreshCw className="h-4 w-4" />

          Retry
        </button>
      </div>
    );
  }


  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <div className="space-y-6">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Analytics
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Real-time manufacturing performance
            and AI-driven process intelligence.
          </p>
        </div>


        <div className="flex flex-wrap gap-3">

          <button
            onClick={handleAIAnalysis}
            disabled={aiRunning}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {aiRunning ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />

                Running AI...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />

                Run AI Analysis
              </>
            )}
          </button>


          <button
            onClick={loadAnalytics}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            <RefreshCw className="h-4 w-4" />

            Refresh
          </button>

        </div>

      </div>


      {/* ======================================================
          AI STATUS MESSAGE
      ====================================================== */}

      {aiMessage && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            lastAIStatus === "success"
              ? "border-green-500/20 bg-green-500/5"
              : "border-red-500/20 bg-red-500/5"
          }`}
        >
          <div className="flex items-center gap-3">

            {lastAIStatus === "success" ? (
              <Sparkles className="h-5 w-5 text-green-400" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400" />
            )}

            <p className="text-sm text-slate-300">
              {aiMessage}
            </p>

          </div>
        </div>
      )}


      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

        <SummaryCard
          title="Total Readings"
          value={`${data.summary.total_readings}`}
          subtitle="Sensor observations"
          icon={
            <Activity className="h-5 w-5 text-blue-400" />
          }
        />


        <SummaryCard
          title="Avg Temperature"
          value={
            data.summary.average_temperature !==
            null
              ? `${data.summary.average_temperature.toFixed(
                  1,
                )} °C`
              : "—"
          }
          subtitle="Across all machines"
          icon={
            <Thermometer className="h-5 w-5 text-orange-400" />
          }
        />


        <SummaryCard
          title="Avg Vibration"
          value={
            data.summary.average_vibration !==
            null
              ? `${data.summary.average_vibration.toFixed(
                  2,
                )} mm/s`
              : "—"
          }
          subtitle="Across all machines"
          icon={
            <Waves className="h-5 w-5 text-purple-400" />
          }
        />


        <SummaryCard
          title="Avg Pressure"
          value={
            data.summary.average_pressure !==
            null
              ? `${data.summary.average_pressure.toFixed(
                  2,
                )} bar`
              : "—"
          }
          subtitle="Across all machines"
          icon={
            <Wind className="h-5 w-5 text-cyan-400" />
          }
        />

      </div>


      {/* ======================================================
          AI PROCESS INTELLIGENCE
      ====================================================== */}

      <Card className="border-blue-500/20 bg-blue-500/5">

        <CardContent className="pt-6">

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

            <div className="flex items-start gap-3">

              <div className="rounded-lg bg-blue-500/10 p-2">
                <Sparkles className="h-5 w-5 text-blue-400" />
              </div>

              <div>

                <h2 className="font-semibold text-white">
                  AI Process Intelligence
                </h2>

                <p className="mt-1 max-w-3xl text-sm text-slate-400">
                  Analyze temperature, vibration,
                  and pressure together to identify
                  unusual machine behavior.
                </p>

              </div>

            </div>


            <Badge className="w-fit border-green-500/20 bg-green-500/10 text-green-400">
              AI Engine Ready
            </Badge>

          </div>

        </CardContent>

      </Card>


      {/* ======================================================
          AI RESULTS
      ====================================================== */}

      <div>

        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">

          <div>

            <h2 className="text-lg font-semibold text-white">
              AI Analysis Results
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Latest anomalies detected by the
              Isolation Forest model.
            </p>

          </div>


          <Badge
            className={
              aiResults.length > 0
                ? "w-fit border-yellow-500/20 bg-yellow-500/10 text-yellow-400"
                : "w-fit border-green-500/20 bg-green-500/10 text-green-400"
            }
          >
            {aiResults.length}{" "}
            {aiResults.length === 1
              ? "Anomaly"
              : "Anomalies"}{" "}
            Detected
          </Badge>

        </div>


        {aiResults.length === 0 ? (

          <Card className="border-slate-800 bg-slate-900">

            <CardContent className="flex min-h-32 items-center justify-center">

              <div className="text-center">

                <Sparkles className="mx-auto h-6 w-6 text-slate-600" />

                <p className="mt-3 text-sm text-slate-400">
                  No AI anomaly results available yet.
                </p>

                <p className="mt-1 text-xs text-slate-600">
                  Run AI Analysis to analyze the
                  latest sensor data.
                </p>

              </div>

            </CardContent>

          </Card>

        ) : (

          <div className="grid gap-4 lg:grid-cols-2">

            {aiResults.map((anomaly, index) => (

              <Card
                key={anomaly.id}
                className="border-yellow-500/20 bg-slate-900"
              >

                <CardHeader>

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex items-start gap-3">

                      <div className="rounded-lg bg-yellow-500/10 p-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-400" />
                      </div>

                      <div>

                        <CardTitle className="text-base text-white">
                          Machine {anomaly.machine_id}
                        </CardTitle>

                        <p className="mt-1 text-xs text-slate-500">
                          AI Anomaly #{index + 1}
                        </p>

                      </div>

                    </div>


                    <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400">
                      {anomaly.severity}
                    </Badge>

                  </div>

                </CardHeader>


                <CardContent className="space-y-4">

                  {/* AI MESSAGE */}

                  <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">

                    <p className="text-sm leading-6 text-slate-300">
                      {anomaly.message}
                    </p>

                  </div>


                  {/* SCORE */}

                  <div className="grid gap-3 sm:grid-cols-2">

                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">

                      <p className="text-xs text-slate-500">
                        Anomaly Score
                      </p>

                      <p className="mt-1 text-lg font-semibold text-yellow-400">
                        {anomaly.anomaly_score !==
                        null
                          ? anomaly.anomaly_score.toFixed(
                              6,
                            )
                          : "—"}
                      </p>

                    </div>


                    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">

                      <p className="text-xs text-slate-500">
                        Sensor Analysis
                      </p>

                      <p className="mt-1 text-sm font-semibold text-white">
                        {anomaly.sensor_type}
                      </p>

                    </div>

                  </div>


                  {anomaly.created_at && (
                    <p className="text-xs text-slate-600">
                      Detected:{" "}
                      {new Date(
                        anomaly.created_at,
                      ).toLocaleString()}
                    </p>
                  )}

                </CardContent>

              </Card>

            ))}

          </div>

        )}

      </div>


      {/* ======================================================
          SENSOR TRENDS
      ====================================================== */}

      <div>

        <div className="mb-4">

          <h2 className="text-lg font-semibold text-white">
            Sensor Trends
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Historical sensor behavior across the factory.
          </p>

        </div>


        <div className="grid gap-5 lg:grid-cols-2">

          <TrendCard
            title="Temperature Trend"
            unit="°C"
            data={trendData}
            dataKey="temperature"
            icon={
              <Thermometer className="h-5 w-5 text-orange-400" />
            }
          />


          <TrendCard
            title="Vibration Trend"
            unit="mm/s"
            data={trendData}
            dataKey="vibration"
            icon={
              <Waves className="h-5 w-5 text-purple-400" />
            }
          />


          <div className="lg:col-span-2">

            <TrendCard
              title="Pressure Trend"
              unit="bar"
              data={trendData}
              dataKey="pressure"
              icon={
                <Wind className="h-5 w-5 text-cyan-400" />
              }
            />

          </div>

        </div>

      </div>


      {/* ======================================================
          ALERT OVERVIEW
      ====================================================== */}

      <div>

        <div className="mb-4">

          <h2 className="text-lg font-semibold text-white">
            Alert Overview
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Factory-level summary. Use the Alerts
            page for detailed alert management.
          </p>

        </div>


        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">

          <StatCard
            label="Total Alerts"
            value={data.alerts.total}
          />

          <StatCard
            label="Critical"
            value={data.alerts.critical}
            valueClass="text-red-400"
          />

          <StatCard
            label="Warnings"
            value={data.alerts.warning}
            valueClass="text-yellow-400"
          />

          <StatCard
            label="Unresolved"
            value={data.alerts.unresolved}
            valueClass="text-orange-400"
          />

        </div>

      </div>


      {/* ======================================================
          MACHINE ANALYTICS
      ====================================================== */}

      <div>

        <div className="mb-4">

          <h2 className="text-lg font-semibold text-white">
            Machine Analytics
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Latest sensor conditions, machine health,
            and machine-specific context.
          </p>

        </div>


        <div className="grid gap-5 lg:grid-cols-2">

          {data.machines.map((machine) => (

            <Card
              key={machine.id}
              className="border-slate-800 bg-slate-900"
            >

              <CardHeader>

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <CardTitle className="text-lg text-white">
                      {machine.name}
                    </CardTitle>

                    <p className="mt-1 text-xs text-slate-500">
                      Machine ID: {machine.id}
                    </p>

                  </div>

                  <MachineStatus
                    status={machine.status}
                  />

                </div>

              </CardHeader>


              <CardContent className="space-y-5">

                {/* HEALTH */}

                <div>

                  <div className="mb-2 flex items-center justify-between">

                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Gauge className="h-4 w-4" />
                      Machine Health
                    </div>

                    <span className="font-semibold text-white">
                      {machine.score.toFixed(1)}%
                    </span>

                  </div>


                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">

                    <div
                      className={`h-full rounded-full transition-all ${
                        machine.score >= 95
                          ? "bg-green-500"
                          : machine.score >= 90
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          Math.max(
                            machine.score,
                            0,
                          ),
                          100,
                        )}%`,
                      }}
                    />

                  </div>

                </div>


                {/* SENSOR VALUES */}

                <div className="grid gap-3 sm:grid-cols-3">

                  <SensorMetric
                    label="Temperature"
                    value={
                      machine.temperature !==
                      null
                        ? `${machine.temperature.toFixed(
                            1,
                          )} °C`
                        : "—"
                    }
                    icon={
                      <Thermometer className="h-4 w-4" />
                    }
                  />


                  <SensorMetric
                    label="Vibration"
                    value={
                      machine.vibration !==
                      null
                        ? `${machine.vibration.toFixed(
                            2,
                          )} mm/s`
                        : "—"
                    }
                    icon={
                      <Waves className="h-4 w-4" />
                    }
                  />


                  <SensorMetric
                    label="Pressure"
                    value={
                      machine.pressure !==
                      null
                        ? `${machine.pressure.toFixed(
                            2,
                          )} bar`
                        : "—"
                    }
                    icon={
                      <Wind className="h-4 w-4" />
                    }
                  />

                </div>


                {/* ALERT COUNT */}

                <div className="flex items-center justify-between border-t border-slate-800 pt-4">

                  <div className="flex items-center gap-2 text-sm text-slate-400">

                    <AlertTriangle className="h-4 w-4" />

                    Machine Alerts

                  </div>

                  <span className="font-semibold text-white">
                    {machine.alert_count}
                  </span>

                </div>


                {/* MACHINE AI INSIGHT */}

                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">

                  <div className="mb-1 flex items-center gap-2">

                    <Activity className="h-4 w-4 text-blue-400" />

                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                      AI Insight
                    </span>

                  </div>


                  <p className="text-sm leading-6 text-slate-300">

                    {machine.alert_count >
                    0
                      ? `${machine.name} has ${machine.alert_count} recorded alerts. Sensor conditions should be monitored for abnormal operating patterns.`
                      : `${machine.name} is currently operating without recorded alerts. Sensor conditions appear stable based on the available data.`}

                  </p>

                </div>

              </CardContent>

            </Card>

          ))}

        </div>

      </div>

    </div>
  );
}


// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900">

      <CardHeader className="pb-2">

        <CardTitle className="flex items-center justify-between text-sm font-medium text-slate-400">

          {title}

          {icon}

        </CardTitle>

      </CardHeader>


      <CardContent>

        <div className="text-3xl font-bold text-white">
          {value}
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {subtitle}
        </p>

      </CardContent>

    </Card>
  );
}


// ============================================================
// TREND CARD
// ============================================================

function TrendCard({
  title,
  unit,
  data,
  dataKey,
  icon,
}: {
  title: string;
  unit: string;
  data: TrendPoint[];
  dataKey:
    | "temperature"
    | "vibration"
    | "pressure";
  icon: React.ReactNode;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900">

      <CardHeader>

        <CardTitle className="flex items-center gap-2 text-base text-white">

          {icon}

          {title}

        </CardTitle>

      </CardHeader>


      <CardContent>

        <div className="h-75 w-full">

          {data.length === 0 ? (

            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No trend data available.
            </div>

          ) : (

            <ResponsiveContainer
              width="100%"
              height="100%"
            >

              <LineChart
                data={data}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                />

                <XAxis
                  dataKey="time"
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 12,
                  }}
                  axisLine={{
                    stroke: "#334155",
                  }}
                  tickLine={{
                    stroke: "#334155",
                  }}
                />

                <YAxis
                  tick={{
                    fill: "#94a3b8",
                    fontSize: 12,
                  }}
                  axisLine={{
                    stroke: "#334155",
                  }}
                  tickLine={{
                    stroke: "#334155",
                  }}
                  width={55}
                />

                <Tooltip
                  contentStyle={
                    tooltipContentStyle
                  }
                  labelStyle={
                    tooltipLabelStyle
                  }
                  itemStyle={
                    tooltipItemStyle
                  }
                  formatter={(value) => [
                    typeof value ===
                    "number"
                      ? `${value} ${unit}`
                      : "—",

                    title.replace(
                      " Trend",
                      "",
                    ),
                  ]}
                />

                <Legend
                  wrapperStyle={{
                    color: "#94a3b8",
                    fontSize: "12px",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey={dataKey}
                  name={title.replace(
                    " Trend",
                    "",
                  )}
                  stroke="#60a5fa"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5 }}
                  connectNulls
                />

              </LineChart>

            </ResponsiveContainer>

          )}

        </div>

      </CardContent>

    </Card>
  );
}


// ============================================================
// STAT CARD
// ============================================================

function StatCard({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900">

      <CardContent className="pt-6">

        <p className="text-sm text-slate-400">
          {label}
        </p>

        <p
          className={`mt-2 text-3xl font-bold ${valueClass}`}
        >
          {value}
        </p>

      </CardContent>

    </Card>
  );
}


// ============================================================
// MACHINE STATUS
// ============================================================

function MachineStatus({
  status,
}: {
  status: string;
}) {
  if (status === "Running") {
    return (
      <Badge className="border-green-500/20 bg-green-500/10 text-green-400">
        Running
      </Badge>
    );
  }

  if (status === "Warning") {
    return (
      <Badge className="border-yellow-500/20 bg-yellow-500/10 text-yellow-400">
        Warning
      </Badge>
    );
  }

  if (status === "Critical") {
    return (
      <Badge className="border-red-500/20 bg-red-500/10 text-red-400">
        Critical
      </Badge>
    );
  }

  return (
    <Badge className="border-slate-700 bg-slate-800 text-slate-300">
      {status}
    </Badge>
  );
}


// ============================================================
// SENSOR METRIC
// ============================================================

function SensorMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">

      <div className="flex items-center gap-2 text-xs text-slate-500">

        {icon}

        {label}

      </div>

      <p className="mt-2 text-sm font-semibold text-white">
        {value}
      </p>

    </div>
  );
}


export default Analytics;