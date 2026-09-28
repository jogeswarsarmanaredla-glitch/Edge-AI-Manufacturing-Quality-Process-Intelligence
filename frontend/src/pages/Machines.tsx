import { useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  CircleAlert,
  Factory,
  RefreshCw,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import {
  getMachineInsights,
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

type MachineInsight = {
  machine_id: number;
  health_score: number;
  health_status?: string;
  combined_status: string;
  anomaly_detected?: boolean;
  explanation?: string;
  recommended_action?: string;
  recorded_at?: string;
};

function getStatusLabel(combinedStatus: string) {
  const normalized = combinedStatus.toLowerCase();

  if (normalized.includes("high deviation")) {
    return "Critical";
  }

  if (normalized.includes("inspection")) {
    return "Warning";
  }

  if (normalized.includes("monitor")) {
    return "Warning";
  }

  return "Running";
}

function getStatusIcon(status: string) {
  if (status === "Running") {
    return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
  }

  if (status === "Warning") {
    return <TriangleAlert className="h-5 w-5 text-amber-400" />;
  }

  return <CircleAlert className="h-5 w-5 text-red-400" />;
}

function getBadgeVariant(
  status: string
): "default" | "secondary" | "destructive" {
  if (status === "Critical") {
    return "destructive";
  }

  if (status === "Warning") {
    return "secondary";
  }

  return "default";
}

function Machines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [insights, setInsights] = useState<MachineInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const loadMachines = async () => {
    try {
      setRefreshing(true);
      setError("");

      const [machineData, insightData] = await Promise.all([
        getMachines(),
        getMachineInsights(),
      ]);

      setMachines(
        Array.isArray(machineData)
          ? machineData
          : []
      );

      setInsights(
        Array.isArray(insightData?.machines)
          ? insightData.machines
          : []
      );
    } catch (err) {
      console.error("Failed to load machine data:", err);
      setError("Failed to load live machine data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMachines();

    const interval = setInterval(() => {
      loadMachines();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const insightMap = useMemo(() => {
    const map = new Map<number, MachineInsight>();

    insights.forEach((insight) => {
      map.set(insight.machine_id, insight);
    });

    return map;
  }, [insights]);

  const machineRows = useMemo(() => {
    return machines.map((machine) => {
      const insight = insightMap.get(machine.id);

      const combinedStatus =
        insight?.combined_status ||
        "Healthy";

      const displayStatus = getStatusLabel(combinedStatus);

      const healthScore =
        insight?.health_score ??
        machine.score;

      return {
        machine,
        insight,
        combinedStatus,
        displayStatus,
        healthScore,
      };
    });
  }, [machines, insightMap]);

  const runningCount = machineRows.filter(
    (row) => row.displayStatus === "Running"
  ).length;

  const warningCount = machineRows.filter(
    (row) => row.displayStatus === "Warning"
  ).length;

  const criticalCount = machineRows.filter(
    (row) => row.displayStatus === "Critical"
  ).length;

  return (
    <section className="space-y-6 p-6">

      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Machines
          </h1>

          <p className="mt-1 text-sm text-slate-400">
            Monitor live machine condition, AI health and operational status.
          </p>
        </div>

        <button
          type="button"
          onClick={loadMachines}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-[#101827] px-3 py-2 text-sm text-slate-200 transition hover:bg-[#172235] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-4 w-4 ${
              refreshing ? "animate-spin" : ""
            }`}
          />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Total Machines
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">
                {machines.length}
              </p>

              <div className="rounded-lg bg-blue-500/10 p-2">
                <Factory className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Running
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-emerald-400">
              {runningCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Warning
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-amber-400">
              {warningCount}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">
              Critical
            </CardTitle>
          </CardHeader>

          <CardContent>
            <p className="text-3xl font-bold text-red-400">
              {criticalCount}
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Machine List */}
      <Card className="border-slate-800 bg-slate-900 text-white">

        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Machine List
            </CardTitle>

            <Badge variant="outline">
              Live AI Data
            </Badge>
          </div>
        </CardHeader>

        <CardContent>

          {loading && (
            <div className="flex items-center justify-center rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-sm text-slate-400">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Loading live machine data...
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-3">

              {machineRows.map(
                ({
                  machine,
                  insight,
                  combinedStatus,
                  displayStatus,
                  healthScore,
                }) => (
                  <div
                    key={machine.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

                      {/* Machine Information */}
                      <div className="flex items-center gap-4">

                        <div className="rounded-lg bg-slate-800 p-3">
                          <Wrench className="h-5 w-5 text-slate-300" />
                        </div>

                        <div>
                          <p className="font-medium">
                            {machine.name}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            Machine ID: {machine.id}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            AI condition: {combinedStatus}
                          </p>
                        </div>

                      </div>

                      {/* Machine Status */}
                      <div className="flex flex-wrap items-center gap-6">

                        <div className="flex items-center gap-2">
                          {getStatusIcon(displayStatus)}

                          <span className="text-sm text-slate-300">
                            {displayStatus}
                          </span>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-400">
                            AI Health Score
                          </p>

                          <p className="font-semibold">
                            {Number(healthScore).toFixed(1)}%
                          </p>
                        </div>

                        <Badge variant={getBadgeVariant(displayStatus)}>
                          {displayStatus}
                        </Badge>

                      </div>

                    </div>

                    {/* AI Details */}
                    {insight && (
                      <div className="mt-4 grid gap-3 md:grid-cols-2">

                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            AI Explanation
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {insight.explanation ||
                              "No additional explanation available."}
                          </p>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-[#111827] p-3">
                          <p className="text-xs uppercase tracking-wide text-slate-500">
                            Recommended Action
                          </p>

                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {insight.recommended_action ||
                              "Continue monitoring machine condition."}
                          </p>
                        </div>

                      </div>
                    )}

                  </div>
                )
              )}

            </div>
          )}

        </CardContent>

      </Card>

    </section>
  );
}

export default Machines;
