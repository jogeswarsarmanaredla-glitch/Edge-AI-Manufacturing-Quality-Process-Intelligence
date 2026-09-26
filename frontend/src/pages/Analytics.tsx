import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Gauge,
  RefreshCw,
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

import { getAnalytics, getSensors } from "../services/api";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";

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

type TrendPoint = {
  time: string;
  timestamp: number;
  temperature?: number;
  vibration?: number;
  pressure?: number;
};

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

function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [sensors, setSensors] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError("");

      const [analyticsResult, sensorResult] = await Promise.all([
        getAnalytics(),
        getSensors(),
      ]);

      setData(analyticsResult);
      setSensors(sensorResult);
    } catch (err) {
      console.error("Analytics loading error:", err);
      setError("Failed to load analytics data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, []);

  const trendData = useMemo<TrendPoint[]>(() => {
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

      const timestamp = new Date(sensor.recorded_at).getTime();

      if (!grouped.has(timestamp)) {
        grouped.set(timestamp, {
          timestamp,
          temperatureValues: [],
          vibrationValues: [],
          pressureValues: [],
        });
      }

      const point = grouped.get(timestamp)!;

      if (sensor.sensor_type === "Temperature") {
        point.temperatureValues.push(sensor.value);
      }

      if (sensor.sensor_type === "Vibration") {
        point.vibrationValues.push(sensor.value);
      }

      if (sensor.sensor_type === "Pressure") {
        point.pressureValues.push(sensor.value);
      }
    }

    return Array.from(grouped.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((point) => ({
        timestamp: point.timestamp,

        time: new Date(point.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),

        temperature:
          point.temperatureValues.length > 0
            ? Number(
                (
                  point.temperatureValues.reduce(
                    (sum, value) => sum + value,
                    0,
                  ) / point.temperatureValues.length
                ).toFixed(2),
              )
            : undefined,

        vibration:
          point.vibrationValues.length > 0
            ? Number(
                (
                  point.vibrationValues.reduce(
                    (sum, value) => sum + value,
                    0,
                  ) / point.vibrationValues.length
                ).toFixed(2),
              )
            : undefined,

        pressure:
          point.pressureValues.length > 0
            ? Number(
                (
                  point.pressureValues.reduce(
                    (sum, value) => sum + value,
                    0,
                  ) / point.pressureValues.length
                ).toFixed(2),
              )
            : undefined,
      }));
  }, [sensors]);

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
              {error || "No analytics data available."}
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Analytics
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Real-time manufacturing performance and AI-driven process
            intelligence.
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-slate-400">
              Total Readings
              <Activity className="h-5 w-5 text-blue-400" />
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {data.summary.total_readings}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Sensor observations
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-slate-400">
              Avg Temperature
              <Thermometer className="h-5 w-5 text-orange-400" />
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {data.summary.average_temperature !== null
                ? `${data.summary.average_temperature.toFixed(1)} °C`
                : "—"}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Across all machines
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-slate-400">
              Avg Vibration
              <Waves className="h-5 w-5 text-purple-400" />
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {data.summary.average_vibration !== null
                ? `${data.summary.average_vibration.toFixed(2)} mm/s`
                : "—"}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Across all machines
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-medium text-slate-400">
              Avg Pressure
              <Wind className="h-5 w-5 text-cyan-400" />
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="text-3xl font-bold text-white">
              {data.summary.average_pressure !== null
                ? `${data.summary.average_pressure.toFixed(2)} bar`
                : "—"}
            </div>

            <p className="mt-1 text-xs text-slate-500">
              Across all machines
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sensor Trends */}
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
            icon={<Thermometer className="h-5 w-5 text-orange-400" />}
          />

          <TrendCard
            title="Vibration Trend"
            unit="mm/s"
            data={trendData}
            dataKey="vibration"
            icon={<Waves className="h-5 w-5 text-purple-400" />}
          />

          <div className="lg:col-span-2">
            <TrendCard
              title="Pressure Trend"
              unit="bar"
              data={trendData}
              dataKey="pressure"
              icon={<Wind className="h-5 w-5 text-cyan-400" />}
            />
          </div>
        </div>
      </div>

      {/* Alert Overview */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">
          Alert Overview
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Alerts" value={data.alerts.total} />

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

      {/* Machine Analytics */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Machine Analytics
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Latest sensor conditions and machine health indicators.
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

                  <MachineStatus status={machine.status} />
                </div>
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Health */}
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
                          Math.max(machine.score, 0),
                          100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Sensors */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <SensorMetric
                    label="Temperature"
                    value={
                      machine.temperature !== null
                        ? `${machine.temperature.toFixed(1)} °C`
                        : "—"
                    }
                    icon={<Thermometer className="h-4 w-4" />}
                  />

                  <SensorMetric
                    label="Vibration"
                    value={
                      machine.vibration !== null
                        ? `${machine.vibration.toFixed(2)} mm/s`
                        : "—"
                    }
                    icon={<Waves className="h-4 w-4" />}
                  />

                  <SensorMetric
                    label="Pressure"
                    value={
                      machine.pressure !== null
                        ? `${machine.pressure.toFixed(2)} bar`
                        : "—"
                    }
                    icon={<Wind className="h-4 w-4" />}
                  />
                </div>

                {/* Alerts */}
                <div className="flex items-center justify-between border-t border-slate-800 pt-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <AlertTriangle className="h-4 w-4" />
                    Machine Alerts
                  </div>

                  <span className="font-semibold text-white">
                    {machine.alert_count}
                  </span>
                </div>

                {/* AI Insight */}
                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                  <div className="mb-1 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blue-400" />

                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                      AI Insight
                    </span>
                  </div>

                  <p className="text-sm leading-6 text-slate-300">
                    {machine.alert_count > 0
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
  dataKey: "temperature" | "vibration" | "pressure";
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
            <ResponsiveContainer width="100%" height="100%">
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
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={{ stroke: "#334155" }}
                />

                <YAxis
                  tick={{ fill: "#94a3b8", fontSize: 12 }}
                  axisLine={{ stroke: "#334155" }}
                  tickLine={{ stroke: "#334155" }}
                  width={55}
                />

                <Tooltip
                  contentStyle={tooltipContentStyle}
                  labelStyle={tooltipLabelStyle}
                  itemStyle={tooltipItemStyle}
                  formatter={(value) => [
                    typeof value === "number"
                      ? `${value} ${unit}`
                      : "—",
                    title.replace(" Trend", ""),
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
                  name={title.replace(" Trend", "")}
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
        <p className="text-sm text-slate-400">{label}</p>

        <p className={`mt-2 text-3xl font-bold ${valueClass}`}>
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function MachineStatus({ status }: { status: string }) {
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