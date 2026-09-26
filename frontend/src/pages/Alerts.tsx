import { useEffect, useState } from "react";

import {
  AlertTriangle,
  CheckCircle2,
  CircleAlert,
  Clock,
  ShieldAlert,
} from "lucide-react";

import { getAlerts } from "@/services/api";

import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AlertItem = {
  id: number;
  machine_id: number;
  sensor_type: string | null;
  alert_type: string;
  severity: string;
  message: string;
  value: number | null;
  unit: string | null;
  created_at: string;
  resolved: boolean;
};

function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAlerts()
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load alerts:", err);
        setError("Failed to load alert data.");
        setLoading(false);
      });
  }, []);

  const criticalAlerts = alerts.filter(
    (alert) => alert.severity === "Critical"
  );

  const warningAlerts = alerts.filter(
    (alert) => alert.severity === "Warning"
  );

  const unresolvedAlerts = alerts.filter(
    (alert) => !alert.resolved
  );

  const getSeverityIcon = (severity: string) => {
    if (severity === "Critical") {
      return (
        <CircleAlert className="h-5 w-5 text-red-400" />
      );
    }

    return (
      <AlertTriangle className="h-5 w-5 text-amber-400" />
    );
  };

  const getSeverityVariant = (
    severity: string
  ): "default" | "secondary" | "destructive" => {
    if (severity === "Critical") {
      return "destructive";
    }

    if (severity === "Warning") {
      return "secondary";
    }

    return "default";
  };

  return (
    <section className="space-y-6 p-6">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Alerts
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Monitor machine conditions and sensor-based alerts.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        {/* Total Alerts */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Total Alerts
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">

              <p className="text-3xl font-bold">
                {alerts.length}
              </p>

              <div className="rounded-lg bg-blue-500/10 p-2">
                <ShieldAlert className="h-5 w-5 text-blue-400" />
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Critical */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Critical
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-red-400">
              {criticalAlerts.length}
            </p>
          </CardContent>
        </Card>

        {/* Warning */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Warning
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-amber-400">
              {warningAlerts.length}
            </p>
          </CardContent>
        </Card>

        {/* Unresolved */}
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Unresolved
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-orange-400">
              {unresolvedAlerts.length}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Loading */}
      {loading && (
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="p-6 text-center text-sm text-slate-400">
            Loading alerts...
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

      {/* No Alerts */}
      {!loading && !error && alerts.length === 0 && (
        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardContent className="flex flex-col items-center justify-center p-10 text-center">

            <CheckCircle2 className="h-10 w-10 text-emerald-400" />

            <h3 className="mt-4 text-lg font-semibold">
              No active alerts
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              All monitored machines are currently within the
              configured thresholds.
            </p>

          </CardContent>
        </Card>
      )}

      {/* Alert List */}
      {!loading && !error && alerts.length > 0 && (
        <Card className="border-slate-800 bg-slate-900 text-white">

          <CardHeader>
            <div className="flex items-center justify-between">

              <CardTitle>
                Alert History
              </CardTitle>

              <Badge variant="outline">
                Database
              </Badge>

            </div>
          </CardHeader>

          <CardContent>

            <div className="space-y-3">

              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >

                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                    {/* Alert Information */}
                    <div className="flex items-start gap-4">

                      <div className="rounded-lg bg-slate-800 p-3">
                        {getSeverityIcon(alert.severity)}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">

                          <p className="font-semibold">
                            {alert.alert_type}
                          </p>

                          <Badge
                            variant={getSeverityVariant(
                              alert.severity
                            )}
                          >
                            {alert.severity}
                          </Badge>

                        </div>

                        <p className="mt-1 text-sm text-slate-300">
                          {alert.message}
                        </p>

                        <p className="mt-2 text-xs text-slate-500">
                          Machine {alert.machine_id}
                          {alert.sensor_type
                            ? ` • ${alert.sensor_type}`
                            : ""}
                        </p>
                      </div>

                    </div>

                    {/* Alert Details */}
                    <div className="flex flex-wrap items-center gap-6">

                      {alert.value !== null && (
                        <div className="text-right">
                          <p className="text-xs text-slate-400">
                            Value
                          </p>

                          <p className="font-semibold">
                            {alert.value} {alert.unit}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Clock className="h-4 w-4" />

                        {new Date(
                          alert.created_at
                        ).toLocaleString()}
                      </div>

                      <Badge
                        variant={
                          alert.resolved
                            ? "default"
                            : "secondary"
                        }
                      >
                        {alert.resolved
                          ? "Resolved"
                          : "Open"}
                      </Badge>

                    </div>

                  </div>

                </div>
              ))}

            </div>

          </CardContent>
        </Card>
      )}

    </section>
  );
}

export default Alerts;