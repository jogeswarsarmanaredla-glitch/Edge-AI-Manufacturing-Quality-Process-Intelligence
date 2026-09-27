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

function Inspections() {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [healthMachines, setHealthMachines] = useState<HealthMachine[]>([]);

  const [selectedMachineId, setSelectedMachineId] =
    useState<string>("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewUrl, setPreviewUrl] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ----------------------------------------------------------
  // Load machines
  // ----------------------------------------------------------

  const loadMachines = async () => {
    try {
      const data = await getMachines();

      setMachines(data);

      if (
        data.length > 0 &&
        !selectedMachineId
      ) {
        setSelectedMachineId(String(data[0].id));
      }
    } catch (err) {
      console.error("Failed to load machines:", err);
      setError("Failed to load machines.");
    }
  };

  // ----------------------------------------------------------
  // Load inspection history
  // ----------------------------------------------------------

  const loadInspections = async () => {
    try {
      const data = await getInspections();

      setInspections(data);
    } catch (err) {
      console.error("Failed to load inspections:", err);
      setError("Failed to load inspection history.");
    }
  };

  // ----------------------------------------------------------
  // Load live health data
  // ----------------------------------------------------------

  const loadHealthScores = async () => {
    try {
      const data = await getHealthScores();

      if (
        data?.status === "ok" &&
        Array.isArray(data.machines)
      ) {
        setHealthMachines(data.machines);
      }
    } catch (err) {
      console.error(
        "Failed to load machine health scores:",
        err
      );
    }
  };

  // ----------------------------------------------------------
  // Initial loading
  // ----------------------------------------------------------

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

  // ----------------------------------------------------------
  // Refresh live health periodically
  // ----------------------------------------------------------

  useEffect(() => {
    const interval = setInterval(() => {
      loadHealthScores();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // ----------------------------------------------------------
  // Selected machine health
  // ----------------------------------------------------------

  const selectedHealth = useMemo(() => {
    if (!selectedMachineId) {
      return null;
    }

    return (
      healthMachines.find(
        (machine) =>
          machine.machine_id ===
          Number(selectedMachineId)
      ) ?? null
    );
  }, [
    selectedMachineId,
    healthMachines,
  ]);

  // ----------------------------------------------------------
  // File selection
  // ----------------------------------------------------------

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    setError("");
    setSuccess("");

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
      setError(
        "Only JPG, PNG, and WEBP images are supported."
      );

      event.target.value = "";
      setSelectedFile(null);
      setPreviewUrl(null);

      return;
    }

    setSelectedFile(file);

    const objectUrl = URL.createObjectURL(file);

    setPreviewUrl(objectUrl);
  };

  // ----------------------------------------------------------
  // Clear selected image
  // ----------------------------------------------------------

  const clearSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError("");
    setSuccess("");
  };

  // ----------------------------------------------------------
  // Create inspection
  // ----------------------------------------------------------

  const handleCreateInspection = async () => {
    setError("");
    setSuccess("");

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
          result?.message ||
            "Inspection could not be created."
        );
        return;
      }

      setSuccess(
        `Inspection #${result.inspection_id} created successfully.`
      );

      clearSelectedFile();

      await loadInspections();
    } catch (err) {
      console.error(
        "Failed to create inspection:",
        err
      );

      setError(
        "Failed to create inspection. Check the backend."
      );
    } finally {
      setUploading(false);
    }
  };

  // ----------------------------------------------------------
  // Machine name helper
  // ----------------------------------------------------------

  const getMachineName = (
    machineId: number
  ) => {
    return (
      machines.find(
        (machine) =>
          machine.id === machineId
      )?.name ??
      `Machine ${machineId}`
    );
  };

  // ----------------------------------------------------------
  // Inspection status
  // ----------------------------------------------------------

  const getInspectionBadge = (
    result: string
  ) => {
    const normalized =
      result.toLowerCase();

    if (normalized === "pass") {
      return "default";
    }

    if (
      normalized === "defect" ||
      normalized === "failed"
    ) {
      return "destructive";
    }

    return "secondary";
  };

  // ----------------------------------------------------------
  // Format timestamp
  // ----------------------------------------------------------

  const formatDate = (
    value: string | null
  ) => {
    if (!value) {
      return "Unknown";
    }

    return new Date(value).toLocaleString();
  };

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <section className="space-y-6 p-6">
      {/* -------------------------------------------------- */}
      {/* Page Header */}
      {/* -------------------------------------------------- */}

      <div>
        <h3 className="text-lg font-semibold text-white">
          AI Inspections
        </h3>

        <p className="text-sm text-slate-400">
          Upload product images, associate them with a
          machine and track inspection results.
        </p>
      </div>

      {/* -------------------------------------------------- */}
      {/* Error / Success */}
      {/* -------------------------------------------------- */}

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

      {/* -------------------------------------------------- */}
      {/* Create Inspection */}
      {/* -------------------------------------------------- */}

      <Card className="border-slate-800 bg-slate-900 text-white">
        <CardHeader>
          <CardTitle>
            Create New Inspection
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            {/* Machine Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-slate-300">
                Select Machine
              </label>

              <select
                value={selectedMachineId}
                onChange={(event) =>
                  setSelectedMachineId(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                {machines.length === 0 && (
                  <option value="">
                    Loading machines...
                  </option>
                )}

                {machines.map((machine) => (
                  <option
                    key={machine.id}
                    value={machine.id}
                  >
                    {machine.name}
                  </option>
                ))}
              </select>

              {/* Live machine state */}
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
                      variant={
                        selectedHealth.status ===
                        "High Deviation"
                          ? "destructive"
                          : selectedHealth.status ===
                              "Healthy"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {selectedHealth.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div>
                      <p className="text-xs text-slate-500">
                        Health
                      </p>

                      <p className="mt-1 font-semibold text-white">
                        {selectedHealth.health_score.toFixed(
                          1
                        )}
                        %
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Temperature
                      </p>

                      <p className="mt-1 font-semibold text-white">
                        {selectedHealth.temperature.toFixed(
                          1
                        )}
                        °C
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Pressure
                      </p>

                      <p className="mt-1 font-semibold text-white">
                        {selectedHealth.pressure.toFixed(
                          2
                        )}
                        {" "}
                        bar
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Vibration
                      </p>

                      <p className="mt-1 font-semibold text-white">
                        {selectedHealth.vibration.toFixed(
                          2
                        )}
                        {" "}
                        mm/s
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Image Upload */}
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

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={
                      handleFileChange
                    }
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
                    onClick={
                      clearSelectedFile
                    }
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
              The current pipeline records the inspection as
              <span className="text-slate-300">
                {" "}Pending
              </span>
              until a computer-vision model is connected.
            </p>

            <button
              type="button"
              disabled={
                uploading ||
                !selectedMachineId ||
                !selectedFile
              }
              onClick={
                handleCreateInspection
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Start Inspection
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* -------------------------------------------------- */}
      {/* Inspection History */}
      {/* -------------------------------------------------- */}

      <Card className="border-slate-800 bg-slate-900 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Inspection History
            </CardTitle>

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

              <p className="text-sm text-slate-400">
                No inspections yet.
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Upload your first product image above.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {inspections.map(
                (inspection) => (
                  <div
                    key={inspection.id}
                    className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-slate-800 p-2">
                          <FileImage className="h-4 w-4 text-slate-300" />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">
                              Inspection #
                              {inspection.id}
                            </p>

                            <Badge
                              variant={
                                getInspectionBadge(
                                  inspection.result
                                )
                              }
                            >
                              {inspection.result}
                            </Badge>
                          </div>

                          <p className="mt-1 text-xs text-slate-400">
                            {getMachineName(
                              inspection.machine_id
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(
                              inspection.created_at
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-3">
                        <div>
                          <p className="text-slate-500">
                            Confidence
                          </p>

                          <p className="mt-1 font-medium text-slate-300">
                            {inspection.confidence !==
                            null
                              ? `${inspection.confidence.toFixed(
                                  1
                                )}%`
                              : "—"}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">
                            Defects
                          </p>

                          <p className="mt-1 font-medium text-slate-300">
                            {inspection.defect_count}
                          </p>
                        </div>

                        <div>
                          <p className="text-slate-500">
                            AI Details
                          </p>

                          <p className="mt-1 max-w-xs text-slate-400">
                            {inspection.defect_details ||
                              "No details available."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* -------------------------------------------------- */}
      {/* Current AI capability note */}
      {/* -------------------------------------------------- */}

      <Card className="border-blue-900/50 bg-blue-950/20 text-white">
        <CardContent className="flex items-start gap-3 p-5">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />

          <div>
            <p className="text-sm font-medium">
              Inspection pipeline connected
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-400">
              Images are currently being stored and linked to
              machines. The next AI layer will analyze the image
              and update the inspection result, confidence,
              defect count and defect details.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

export default Inspections;