import pandas as pd
from sklearn.ensemble import IsolationForest


CSV_PATH = "sensors.csv"
AI_ALERTS_PATH = "ai_alerts.csv"


def load_sensor_data():
    df = pd.read_csv(
        CSV_PATH,
        encoding="latin1",
    )

    df["recorded_at"] = pd.to_datetime(
        df["recorded_at"]
    )

    return df


def prepare_features(df):
    features = (
        df.pivot_table(
            index=["machine_id", "recorded_at"],
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

    features = features[required_columns]

    features = features.dropna(
        subset=[
            "Temperature",
            "Vibration",
            "Pressure",
        ]
    )

    return features


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

    features["prediction"] = model.predict(X)

    features["anomaly_score"] = (
        -model.decision_function(X)
    )

    return features


def create_ai_alerts(anomalies):
    alerts = []

    for _, row in anomalies.iterrows():

        message = (
            f"AI detected an unusual combination of sensor "
            f"readings. Temperature: {row['Temperature']:.1f} °C, "
            f"Vibration: {row['Vibration']:.1f} mm/s, "
            f"Pressure: {row['Pressure']:.2f} bar."
        )

        alerts.append(
            {
                "machine_id": int(row["machine_id"]),
                "sensor_type": "Multi-sensor",
                "alert_type": "AI Anomaly",
                "severity": "Warning",
                "message": message,
                "value": round(
                    float(row["anomaly_score"]),
                    6,
                ),
                "unit": "anomaly_score",
                "created_at": row["recorded_at"],
                "resolved": False,
            }
        )

    return pd.DataFrame(alerts)


if __name__ == "__main__":

    print("\nLoading sensor data...")

    df = load_sensor_data()

    print(
        f"Raw sensor rows: {len(df)}"
    )

    features = prepare_features(df)

    print(
        f"ML feature rows: {len(features)}"
    )

    results = detect_anomalies(features)

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

    # Create AI alert records
    ai_alerts = create_ai_alerts(anomalies)

    # Save AI alerts for PostgreSQL import
    ai_alerts.to_csv(
        AI_ALERTS_PATH,
        index=False,
        encoding="utf-8",
    )

    print("\n================================")
    print("AI Alert Export")
    print("================================")

    print(
        f"AI alerts written: {len(ai_alerts)}"
    )

    print(
        f"File: {AI_ALERTS_PATH}"
    )