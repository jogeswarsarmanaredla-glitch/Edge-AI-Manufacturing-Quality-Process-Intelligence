import pandas as pd
import requests
from sklearn.ensemble import IsolationForest


# ============================================================
# FASTAPI CONFIGURATION
# ============================================================

FASTAPI_URL = "http://172.19.32.1:8000"


# ============================================================
# LOAD LIVE SENSOR DATA FROM FASTAPI
# ============================================================

def load_sensor_data():
    url = f"{FASTAPI_URL}/api/sensors"

    print("\nConnecting to FastAPI...")
    print(f"URL: {url}")

    try:
        response = requests.get(
            url,
            timeout=10,
        )

        response.raise_for_status()

        data = response.json()

    except requests.RequestException as error:
        raise RuntimeError(
            f"Failed to fetch sensor data from FastAPI: {error}"
        )

    if not data:
        raise RuntimeError(
            "FastAPI returned no sensor data."
        )

    df = pd.DataFrame(data)

    df["recorded_at"] = pd.to_datetime(
        df["recorded_at"]
    )

    print(
        f"Live sensor rows received: {len(df)}"
    )

    return df


# ============================================================
# PREPARE ML FEATURES
# ============================================================

def prepare_features(df):
    features = (
        df.pivot_table(
            index=[
                "machine_id",
                "recorded_at",
            ],
            columns="sensor_type",
            values="value",
            aggfunc="mean",
        )
        .reset_index()
    )

    features.columns.name = None

    required_columns = [
        "machine_id",
        "recorded_at",
        "Temperature",
        "Vibration",
        "Pressure",
    ]

    missing_columns = [
        column
        for column in required_columns
        if column not in features.columns
    ]

    if missing_columns:
        raise RuntimeError(
            f"Missing sensor types: {missing_columns}"
        )

    features = features[
        required_columns
    ]

    features = features.dropna(
        subset=[
            "Temperature",
            "Vibration",
            "Pressure",
        ]
    )

    return features


# ============================================================
# ISOLATION FOREST
# ============================================================

def detect_anomalies(features):
    X = features[
        [
            "Temperature",
            "Vibration",
            "Pressure",
        ]
    ]

    model = IsolationForest(
        n_estimators=200,
        contamination=0.10,
        random_state=42,
    )

    model.fit(X)

    features = features.copy()

    features["prediction"] = model.predict(X)

    features["anomaly_score"] = (
        -model.decision_function(X)
    )

    return features


# ============================================================
# CREATE AI ALERT PAYLOAD
# ============================================================

def create_ai_alerts(anomalies):
    alerts = []

    for _, row in anomalies.iterrows():

        message = (
            "AI detected an unusual combination of "
            "sensor readings. "
            f"Temperature: {row['Temperature']:.1f} °C, "
            f"Vibration: {row['Vibration']:.1f} mm/s, "
            f"Pressure: {row['Pressure']:.2f} bar."
        )

        alerts.append(
            {
                "machine_id": int(
                    row["machine_id"]
                ),
                "sensor_type": "Multi-sensor",
                "alert_type": "AI Anomaly",
                "severity": "Warning",
                "message": message,
                "value": round(
                    float(row["anomaly_score"]),
                    6,
                ),
                "unit": "anomaly_score",
                "created_at": (
                    row["recorded_at"].isoformat()
                ),
                "resolved": False,
            }
        )

    return alerts


# ============================================================
# SEND AI ALERTS TO FASTAPI
# ============================================================

def send_alerts_to_backend(alerts):
    if not alerts:
        print("\nNo anomalies detected.")
        return

    url = (
        f"{FASTAPI_URL}/api/ai-alerts"
    )

    print("\n================================")
    print("Sending AI Alerts to FastAPI")
    print("================================")

    try:
        response = requests.post(
            url,
            json=alerts,
            timeout=10,
        )

        response.raise_for_status()

        result = response.json()

        print(
            f"Backend status: {response.status_code}"
        )

        print(
            f"Alerts sent: {len(alerts)}"
        )

        print(
            f"Alerts inserted: {result['inserted']}"
        )

        print(
            f"Alerts skipped: {result['skipped']}"
        )

    except requests.RequestException as error:
        print(
            "\nFailed to send AI alerts."
        )

        print(
            f"Error: {error}"
        )


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print("\n================================")
    print("Manufacturing AI - ML Pipeline")
    print("================================")

    # 1. Get live sensor data
    df = load_sensor_data()

    # 2. Prepare ML features
    features = prepare_features(df)

    print(
        f"ML feature rows: {len(features)}"
    )

    # 3. Run Isolation Forest
    results = detect_anomalies(
        features
    )

    # 4. Keep only anomalies
    anomalies = results[
        results["prediction"] == -1
    ].sort_values(
        "anomaly_score",
        ascending=False,
    )

    print("\n================================")
    print("Isolation Forest Results")
    print("================================")

    print(
        f"Total observations: {len(results)}"
    )

    print(
        f"Anomalies detected: {len(anomalies)}"
    )

    print("\nTop anomalies:")

    if anomalies.empty:
        print("No anomalies detected.")

    else:
        print(
            anomalies[
                [
                    "machine_id",
                    "recorded_at",
                    "Temperature",
                    "Vibration",
                    "Pressure",
                    "anomaly_score",
                ]
            ]
            .head(10)
            .to_string(index=False)
        )

    # 5. Create alert payloads
    ai_alerts = create_ai_alerts(
        anomalies
    )

    print("\nAI alerts generated:", len(ai_alerts))

    # 6. Automatically send to backend
    send_alerts_to_backend(
        ai_alerts
    )