const API_BASE_URL = "http://127.0.0.1:8000";

export async function checkBackendHealth() {
  const response = await fetch(`${API_BASE_URL}/api/health`);

  if (!response.ok) {
    throw new Error("Backend request failed");
  }

  return response.json();
}

export async function getMachines() {
  const response = await fetch(`${API_BASE_URL}/api/machines`);

  if (!response.ok) {
    throw new Error("Failed to fetch machines");
  }

  return response.json();
}

export async function getSensors() {
  const response = await fetch(`${API_BASE_URL}/api/sensors`);

  if (!response.ok) {
    throw new Error("Failed to fetch sensors");
  }

  return response.json();
}

export async function getAlerts() {
  const response = await fetch(`${API_BASE_URL}/api/alerts`);

  if (!response.ok) {
    throw new Error("Failed to fetch alerts");
  }

  return response.json();
}

export async function getAnalytics() {
  const response = await fetch(`${API_BASE_URL}/api/analytics`);

  if (!response.ok) {
    throw new Error("Failed to fetch analytics");
  }

  return response.json();
}

export async function runAIAnalysis() {
  const response = await fetch(`${API_BASE_URL}/api/ai/analyze`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to run AI analysis");
  }

  return response.json();
}

export async function getHealthScores() {
  const response = await fetch(`${API_BASE_URL}/api/health-scores`);

  if (!response.ok) {
    throw new Error("Failed to fetch health scores");
  }

  return response.json();
}

// ============================================================
// INSPECTIONS
// ============================================================

export async function getInspections() {
  const response = await fetch(`${API_BASE_URL}/api/inspections`);

  if (!response.ok) {
    throw new Error("Failed to fetch inspections");
  }

  return response.json();
}

export async function createInspection(
  machineId: number,
  file: File
) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/api/inspections/create?machine_id=${machineId}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error("Failed to create inspection");
  }

  return response.json();
}
// ============================================================
// COMBINED MACHINE AI INSIGHTS
// ============================================================

export async function getMachineInsights() {
  const response = await fetch(
    `${API_BASE_URL}/api/machine-insights`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch machine AI insights");
  }

  return response.json();
}