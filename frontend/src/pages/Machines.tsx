import { useEffect, useState } from "react";

import {
  CheckCircle2,
  CircleAlert,
  Factory,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import { getMachines } from "@/services/api";

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

function Machines() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getMachines()
      .then((data) => {
        setMachines(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load machines:", err);
        setError("Failed to load machine data.");
        setLoading(false);
      });
  }, []);

  const getStatusIcon = (status: string) => {
    if (status === "Running") {
      return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    }

    if (status === "Warning") {
      return <TriangleAlert className="h-5 w-5 text-amber-400" />;
    }

    return <CircleAlert className="h-5 w-5 text-red-400" />;
  };

  const getBadgeVariant = (
    status: string
  ): "default" | "secondary" | "destructive" => {
    if (status === "Critical") {
      return "destructive";
    }

    if (status === "Warning") {
      return "secondary";
    }

    return "default";
  };

  return (
    <section className="space-y-6 p-6">

      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Machines
        </h1>

        <p className="mt-1 text-sm text-slate-400">
          Monitor machine status and quality performance.
        </p>
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
              {
                machines.filter(
                  (machine) => machine.status === "Running"
                ).length
              }
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
              {
                machines.filter(
                  (machine) => machine.status === "Warning"
                ).length
              }
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
              {
                machines.filter(
                  (machine) => machine.status === "Critical"
                ).length
              }
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Machine List */}
      <Card className="border-slate-800 bg-slate-900 text-white">

        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Machine List
            </CardTitle>

            <Badge variant="outline">
              Live Data
            </Badge>
          </div>
        </CardHeader>

        <CardContent>

          {loading && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
              Loading machine data...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/20 p-6 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="space-y-3">

              {machines.map((machine) => (
                <div
                  key={machine.id}
                  className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
                >

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
                    </div>

                  </div>

                  {/* Machine Status */}
                  <div className="flex items-center gap-6">

                    <div className="flex items-center gap-2">
                      {getStatusIcon(machine.status)}

                      <span className="text-sm text-slate-300">
                        {machine.status}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-400">
                        Quality Score
                      </p>

                      <p className="font-semibold">
                        {machine.score.toFixed(1)}%
                      </p>
                    </div>

                    <Badge variant={getBadgeVariant(machine.status)}>
                      {machine.status}
                    </Badge>

                  </div>

                </div>
              ))}

            </div>
          )}

        </CardContent>

      </Card>

    </section>
  );
}

export default Machines;