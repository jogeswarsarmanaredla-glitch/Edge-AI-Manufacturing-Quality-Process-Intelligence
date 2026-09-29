import { useEffect, useMemo, useState } from "react";

import {
  Activity,
  Gauge,
  Thermometer,
  Waves,
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

import { getSensors } from "@/services/api";

import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Sensor = {
  id: number;
  machine_id: number;
  sensor_type: string;
  value: number;
  unit: string;
  recorded_at: string;
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

function Sensors() {
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getSensors()
      .then((data) => {
        setSensors(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load sensors:", err);
        setError("Failed to load sensor data.");
        setLoading(false);
      });
  }, []);

  const temperatureSensors = sensors.filter(
    (sensor) => sensor.sensor_type === "Temperature"
  );

  const vibrationSensors = sensors.filter(
    (sensor) => sensor.sensor_type === "Vibration"
  );

  const pressureSensors = sensors.filter(
    (sensor) => sensor.sensor_type === "Pressure"
  );

  const temperatureChartData = useMemo(() => {
    return [...temperatureSensors]
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime()
      )
      .map((sensor) => ({
        time: new Date(sensor.recorded_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: sensor.value,
        machine: `Machine ${sensor.machine_id}`,
      }));
  }, [temperatureSensors]);

  const vibrationChartData = useMemo(() => {
    return [...vibrationSensors]
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime()
      )
      .map((sensor) => ({
        time: new Date(sensor.recorded_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: sensor.value,
        machine: `Machine ${sensor.machine_id}`,
      }));
  }, [vibrationSensors]);

  const pressureChartData = useMemo(() => {
    return [...pressureSensors]
      .sort(
        (a, b) =>
          new Date(a.recorded_at).getTime() -
          new Date(b.recorded_at).getTime()
      )
      .map((sensor) => ({
        time: new Date(sensor.recorded_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: sensor.value,
        machine: `Machine ${sensor.machine_id}`,
      }));
  }, [pressureSensors]);

  const getSensorIcon = (sensorType: string) => {
    if (sensorType === "Temperature") {
      return (
        <Thermometer className="h-5 w-5 text-orange-400" />
      );
    }

    if (sensorType === "Vibration") {
      return (
        <Waves className="h-5 w-5 text-blue-400" />
      );
    }

    return (
      <Gauge className="h-5 w-5 text-emerald-400" />
    );
  };

  return (
    <section className="space-y-6 p-6">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Sensors
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Monitor machine sensor measurements and historical trends.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total Readings */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Total Readings
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">
                {sensors.length}
              </p>

              <div className="rounded-lg bg-blue-500/10 p-2">
                <Activity className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Temperature */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Temperature
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-orange-400">
              {temperatureSensors.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              readings
            </p>
          </CardContent>
        </Card>

        {/* Vibration */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Vibration
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-blue-400">
              {vibrationSensors.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              readings
            </p>
          </CardContent>
        </Card>

        {/* Pressure */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Pressure
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">
              {pressureSensors.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              readings
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Loading */}
      {loading && (
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="p-6 text-center text-sm text-slate-400">
            Loading sensor data...
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && !loading && (
        <Card className="border-red-900/50 bg-slate-900 text-white">
          <CardContent className="p-6 text-center text-sm text-red-400">
            {error}
          </CardContent>
        </Card>
      )}

      {/* Sensor Content */}
      {!loading && !error && (
        <>
          {/* Temperature Trend */}
          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Temperature Trend
                </CardTitle>

                <Badge variant="outline">
                  °C
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={temperatureChartData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="time" />

                    <YAxis />

                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                    />

                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Temperature"
                      stroke="currentColor"
                      className="text-orange-400"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Vibration Trend */}
          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Vibration Trend
                </CardTitle>

                <Badge variant="outline">
                  mm/s
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={vibrationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="time" />

                    <YAxis />

                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                    />

                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Vibration"
                      stroke="currentColor"
                      className="text-blue-400"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Pressure Trend */}
          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Pressure Trend
                </CardTitle>

                <Badge variant="outline">
                  bar
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pressureChartData}>
                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis dataKey="time" />

                    <YAxis />

                    <Tooltip
                      contentStyle={tooltipContentStyle}
                      labelStyle={tooltipLabelStyle}
                      itemStyle={tooltipItemStyle}
                    />

                    <Legend />

                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Pressure"
                      stroke="currentColor"
                      className="text-emerald-400"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Latest Sensor Readings */}
          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  Latest Sensor Readings
                </CardTitle>

                <Badge variant="outline">
                  Database
                </Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-3">

                {sensors.slice(0, 12).map((sensor) => (
                  <div
                    key={sensor.id}
                    className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="flex items-center gap-4">

                      <div className="rounded-lg bg-slate-800 p-3">
                        {getSensorIcon(sensor.sensor_type)}
                      </div>

                      <div>
                        <p className="font-medium">
                          {sensor.sensor_type}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Machine {sensor.machine_id}
                        </p>
                      </div>

                    </div>

                    <div className="flex items-center gap-6">

                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          Value
                        </p>

                        <p className="font-semibold">
                          {sensor.value} {sensor.unit}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          Recorded
                        </p>

                        <p className="text-xs text-slate-300">
                          {new Date(
                            sensor.recorded_at
                          ).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                    </div>

                  </div>
                ))}

              </div>
            </CardContent>
          </Card>
        </>
      )}

    </section>
  );
}

export default Sensors;