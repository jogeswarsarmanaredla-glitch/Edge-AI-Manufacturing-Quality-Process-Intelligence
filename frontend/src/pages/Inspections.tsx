import { useEffect, useMemo, useState } from "react";

import {
  CheckCircle2,
  FileImage,
  RefreshCw,
  Upload,
  Wrench,
  X,
} from "lucide-react";

import {
  createInspection,
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

// ============================================================
// TYPES
// ============================================================

type Machine = {
  id: number;
  name: string;
  status: string;
  score: number;
};

type Inspection = {
  id: number;
  machine_id: number;
  image_path: string;
  result: string;
  confidence: number | null;
  defect_count: number;
  defect_details: string | null;
  health_score_at_inspection: number | null;
  temperature_at_inspection: number | null;
  pressure_at_inspection: number | null;
  vibration_at_inspection: number | null;
  anomaly_status_at_inspection: string | null;
  created_at: string | null;
};

type HealthMachine = {
  machine_id: number;
  profile: string;
  temperature: number;
  pressure: number;
  vibration: number;
  health_score: number;
  status: string;
};

type CreatedInspectionResult = {
  inspection_id: number;
  result: string;
  confidence: number | null;
  defect_count: number;
  defect_details: string;
  health_score_at_inspection: number | null;
  temperature_at_inspection: number | null;
  pressure_at_inspection: number | null;
  vibration_at_inspection: number | null;
  anomaly_status_at_inspection: string | null;
};

// ============================================================
// HELPERS
// ============================================================

function getResultBadgeClasses(result: string) {
  const normalized = result.toLowerCase();

  if (
    normalized === "pass" ||
    normalized === "normal" ||
    normalized === "healthy"
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10";
  }

  if (
    normalized === "defect" ||
    normalized === "failed" ||
    normalized === "fail"
  ) {
    return "border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/10";
  }

  return "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/10";
}

function getAnomalyClasses(status: string | null) {
  const normalized = (status ?? "").toLowerCase();

  if (normalized.includes("no anomaly")) {
    return "text-emerald-400";
  }

  if (normalized.includes("detected")) {
    return "text-yellow-400";
  }

  return "text-slate-400";
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";

  return new Date(value).toLocaleString();
}

// ============================================================
// COMPONENT
// ============================================================

function Inspections() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [healthMachines, setHealthMachines] = useState<HealthMachine[]>([]);

  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastResult, setLastResult] =
    useState<CreatedInspectionResult | null>(null);

  // ==========================================================
  // LOAD MACHINES
  // ==========================================================

  const loadMachines = async () => {
    try {
      const data = await getMachines();

      setMachines(data);

      if (data.length > 0 && !selectedMachineId) {
        setSelectedMachineId(String(data[0].id));
      }
    } catch (err) {
      console.error("Failed to load machines:", err);
      setError("Failed to load machines.");
    }
  };

  // ==========================================================
  // LOAD INSPECTION HISTORY
  // ==========================================================

  const loadInspections = async () => {
    try {
      const data = await getInspections();
      setInspections(data);
    } catch (err) {
      console.error("Failed to load inspections:", err);
      setError("Failed to load inspection history.");
    }
  };

  // ==========================================================
  // LOAD LIVE HEALTH DATA
  // ==========================================================

  const loadHealthScores = async () => {
    try {
      const data = await getHealthScores();

      if (data?.status === "ok" && Array.isArray(data.machines)) {
        setHealthMachines(data.machines);
      }
    } catch (err) {
      console.error("Failed to load machine health scores:", err);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    const loadPage = async () => {
      setLoading(true);
      setError("");

      await Promise.all([
        loadMachines(),
        loadInspections(),
        loadHealthScores(),
      ]);

      setLoading(false);
    };

    loadPage();
  }, []);

  // ==========================================================
  // LIVE HEALTH REFRESH
  // ==========================================================

  useEffect(() => {
    const interval = setInterval(() => {
      loadHealthScores();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // ==========================================================
  // SELECTED MACHINE HEALTH
  // ==========================================================

  const selectedHealth = useMemo(() => {
    if (!selectedMachineId) return null;

    return (
      healthMachines.find(
        (machine) => machine.machine_id === Number(selectedMachineId)
      ) ?? null
    );
  }, [selectedMachineId, healthMachines]);

  // ==========================================================
  // FILE SELECTION
  // ==========================================================

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");
    setLastResult(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Only JPG, PNG, and WEBP images are supported.");
      event.target.value = "";
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  // ==========================================================
  // CLEAR IMAGE
  // ==========================================================

  const clearSelectedFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setError("");
    setSuccess("");
  };

  // ==========================================================
  // CREATE INSPECTION
  // ==========================================================

  const handleCreateInspection = async () => {
    setError("");
    setSuccess("");
    setLastResult(null);

    if (!selectedMachineId) {
      setError("Please select a machine.");
      return;
    }

    if (!selectedFile) {
      setError("Please select an inspection image.");
      return;
    }

    try {
      setUploading(true);

      const result = await createInspection(
        Number(selectedMachineId),
        selectedFile
      );

      if (result?.status !== "ok") {
        setError(
          result?.message || "Inspection could not be created."
        );
        return;
      }

      const inspectionResult: CreatedInspectionResult = {
        inspection_id: Number(result.inspection_id),
        result: result.result ?? "Pending",
        confidence:
          result.confidence !== null && result.confidence !== undefined
            ? Number(result.confidence)
            : null,
        defect_count: Number(result.defect_count ?? 0),
        defect_details:
          result.defect_details ??
          "Computer vision analysis completed.",
        health_score_at_inspection:
          result.health_score_at_inspection !== null &&
          result.health_score_at_inspection !== undefined
            ? Number(result.health_score_at_inspection)
            : null,
        temperature_at_inspection:
          result.temperature_at_inspection !== null &&
          result.temperature_at_inspection !== undefined
            ? Number(result.temperature_at_inspection)
            : null,
        pressure_at_inspection:
          result.pressure_at_inspection !== null &&
          result.pressure_at_inspection !== undefined
            ? Number(result.pressure_at_inspection)
            : null,
        vibration_at_inspection:
          result.vibration_at_inspection !== null &&
          result.vibration_at_inspection !== undefined
            ? Number(result.vibration_at_inspection)
            : null,
        anomaly_status_at_inspection:
          result.anomaly_status_at_inspection ?? "Unavailable",
      };

      setLastResult(inspectionResult);

      setSuccess(
        `Inspection #${result.inspection_id} completed successfully.`
      );

      clearSelectedFile();
      await loadInspections();
    } catch (err) {
      console.error("Failed to create inspection:", err);
      setError("Failed to create inspection. Check the backend.");
    } finally {
      setUploading(false);
    }
  };

  // ==========================================================
  // HELPERS
  // ==========================================================

  const getMachineName = (machineId: number) => {
    return (
      machines.find((machine) => machine.id === machineId)?.name ??
      `Machine ${machineId}`
    );
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <section className="space-y-6 p-6">
      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}

      <div>
        <h3 className="text-lg font-semibold text-white">
          AI Inspections
        </h3>

        <p className="text-sm text-slate-400">
          Upload a supported product image, run the trained computer-vision
          model and capture the machine condition at inspection time.
        </p>
      </div>

      {/* ====================================================== */}
      {/* MESSAGES */}
      {/* ====================================================== */}

      {error && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-300">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/30 p-4 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* ====================================================== */}
      {/* LATEST CV RESULT */}
      {/* ====================================================== */}

      {lastResult && (
        <Card className="border-blue-900/50 bg-blue-950/20 text-white">
          <CardHeader>
            <CardTitle className="text-base">
              Latest AI Inspection Result
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-500">Result</p>
                <Badge
                  className={`mt-2 ${getResultBadgeClasses(
                    lastResult.result
                  )}`}
                >
                  {lastResult.result}
                </Badge>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-500">Confidence</p>
                <p className="mt-1 font-semibold text-white">
                  {lastResult.confidence !== null
                    ? `${lastResult.confidence.toFixed(1)}%`
                    : "—"}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-500">Defects</p>
                <p className="mt-1 font-semibold text-white">
                  {lastResult.defect_count}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-500">Health</p>
                <p className="mt-1 font-semibold text-white">
                  {lastResult.health_score_at_inspection !== null
                    ? `${lastResult.health_score_at_inspection.toFixed(1)}%`
                    : "—"}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-500">Anomaly</p>
                <p
                  className={`mt-1 text-sm font-semibold ${getAnomalyClasses(
                    lastResult.anomaly_status_at_inspection
                  )}`}
                >
                  {lastResult.anomaly_status_at_inspection ?? "Unavailable"}
                </p>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <p className="text-xs text-slate-500">AI Details</p>
                <p className="mt-1 text-sm font-medium text-slate-300">
                  {lastResult.defect_details}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ====================================================== */}
      {/* CREATE INSPECTION */}
      {/* ====================================================== */}

      <Card className="border-slate-800 bg-slate-900 text-white">
        <CardHeader>
          <CardTitle>Create New Inspection</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Machine */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">
                Select Machine
              </label>

              <select
                value={selectedMachineId}
                onChange={(event) => setSelectedMachineId(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                {machines.length === 0 && (
                  <option value="">Loading machines...</option>
                )}

                {machines.map((machine) => (
                  <option key={machine.id} value={machine.id}>
                    {machine.name}
                  </option>
                ))}
              </select>

              {selectedHealth && (
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-4 w-4 text-blue-400" />
                      <span className="text-sm font-medium text-slate-300">
                        Live Machine Condition
                      </span>
                    </div>

                    <Badge
                      className={getResultBadgeClasses(selectedHealth.status)}
                    >
                      {selectedHealth.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-500">Health</p>
                      <p className="mt-1 font-semibold text-white">
                        {selectedHealth.health_score.toFixed(1)}%
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Temperature</p>
                      <p className="mt-1 font-semibold text-white">
                        {selectedHealth.temperature.toFixed(1)}°C
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Pressure</p>
                      <p className="mt-1 font-semibold text-white">
                        {selectedHealth.pressure.toFixed(2)} bar
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">Vibration</p>
                      <p className="mt-1 font-semibold text-white">
                        {selectedHealth.vibration.toFixed(2)} mm/s
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Image */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">
                Inspection Image
              </label>

              {!selectedFile ? (
                <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center transition hover:border-blue-500 hover:bg-slate-950">
                  <FileImage className="mb-3 h-10 w-10 text-slate-500" />

                  <p className="text-sm font-medium text-slate-300">
                    Upload product image
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    JPG, PNG or WEBP
                  </p>

                  <p className="mt-2 text-[11px] text-slate-600">
                    For the current trained model, use NEU steel-surface images.
                  </p>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              ) : (
                <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
                  {previewUrl && (
                    <img
                      src={previewUrl}
                      alt="Inspection preview"
                      className="h-56 w-full object-contain"
                    />
                  )}

                  <button
                    type="button"
                    onClick={clearSelectedFile}
                    className="absolute right-3 top-3 rounded-full bg-slate-950/80 p-2 text-slate-300 transition hover:bg-red-950 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>

                  <div className="border-t border-slate-800 p-3">
                    <p className="truncate text-xs text-slate-400">
                      {selectedFile.name}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">
              The trained CV pipeline analyzes the uploaded image and stores the
              result together with the machine condition snapshot.
            </p>

            <button
              type="button"
              disabled={uploading || !selectedMachineId || !selectedFile}
              onClick={handleCreateInspection}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Start AI Inspection
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* ====================================================== */}
      {/* HISTORY */}
      {/* ====================================================== */}

      <Card className="border-slate-800 bg-slate-900 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Inspection History</CardTitle>

            <button
              type="button"
              onClick={loadInspections}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:bg-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-6 text-center text-sm text-slate-400">
              Loading inspection history...
            </div>
          ) : inspections.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/60 p-8 text-center">
              <FileImage className="mx-auto mb-3 h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">No inspections yet.</p>
              <p className="mt-1 text-xs text-slate-500">
                Upload your first inspection image above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspections.map((inspection) => (
                <div
                  key={inspection.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                    {/* Identity */}
                    <div className="flex min-w-56 items-start gap-3">
                      <div className="rounded-lg bg-slate-800 p-2">
                        <FileImage className="h-4 w-4 text-slate-300" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">
                            Inspection #{inspection.id}
                          </p>

                          <Badge
                            className={getResultBadgeClasses(
                              inspection.result
                            )}
                          >
                            {inspection.result}
                          </Badge>
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          {getMachineName(inspection.machine_id)}
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          {formatDate(inspection.created_at)}
                        </p>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-xs sm:grid-cols-4 xl:grid-cols-6">
                      <div>
                        <p className="text-slate-500">Health</p>
                        <p className="mt-1 font-medium text-slate-200">
                          {inspection.health_score_at_inspection !== null
                            ? `${inspection.health_score_at_inspection.toFixed(1)}%`
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">Temp</p>
                        <p className="mt-1 font-medium text-slate-200">
                          {inspection.temperature_at_inspection !== null
                            ? `${inspection.temperature_at_inspection.toFixed(1)} °C`
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">Pressure</p>
                        <p className="mt-1 font-medium text-slate-200">
                          {inspection.pressure_at_inspection !== null
                            ? `${inspection.pressure_at_inspection.toFixed(2)} bar`
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">Vibration</p>
                        <p className="mt-1 font-medium text-slate-200">
                          {inspection.vibration_at_inspection !== null
                            ? `${inspection.vibration_at_inspection.toFixed(2)} mm/s`
                            : "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-slate-500">Anomaly</p>
                        <p
                          className={`mt-1 max-w-36 font-medium ${getAnomalyClasses(
                            inspection.anomaly_status_at_inspection
                          )}`}
                        >
                          {inspection.anomaly_status_at_inspection ??
                            "Unavailable"}
                        </p>
                      </div>

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

                      <div className="col-span-2 sm:col-span-4 xl:col-span-6">
                        <p className="text-slate-500">AI Details</p>
                        <p className="mt-1 text-slate-300">
                          {inspection.defect_details ||
                            "No details available."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====================================================== */}
      {/* CAPABILITY NOTE */}
      {/* ====================================================== */}

      <Card className="border-blue-900/50 bg-blue-950/20 text-white">
        <CardContent className="flex items-start gap-3 p-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

          <div>
            <p className="text-sm font-medium">
              Computer-vision inspection connected
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              The current model was trained on NEU steel-surface defect images.
              Its prediction is stored together with the machine health,
              temperature, pressure, vibration and anomaly snapshot captured at
              inspection time.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default Inspections;
