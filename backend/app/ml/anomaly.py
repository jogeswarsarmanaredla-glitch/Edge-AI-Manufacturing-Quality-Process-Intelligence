import sys
from datetime import datetime, timedelta
from pathlib import Path

import pandas as pd
from sklearn.ensemble import IsolationForest

BACKEND_DIR = Path(__file__).resolve().parents[2]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import engine
from sqlalchemy import text

CONTAMINATION = 0.10
AI_ALERT_COOLDOWN_SECONDS = 60


def load_sensor_data():
    with engine.connect() as connection:
        rows = connection.execute(
            text("""
                SELECT machine_id, sensor_type, value, recorded_at
                FROM sensors
                ORDER BY recorded_at DESC, id DESC
            """)
        ).mappings().all()
    if not rows:
        raise RuntimeError("No sensor data found in the database.")
    df = pd.DataFrame(rows)
    df["recorded_at"] = pd.to_datetime(df["recorded_at"])
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
    required = [
        "machine_id",
        "recorded_at",
        "Temperature",
        "Vibration",
        "Pressure",
    ]
    missing = [c for c in required if c not in features.columns]
    if missing:
        raise RuntimeError(f"Missing sensor types: {missing}")
    return features[required].dropna(
        subset=["Temperature", "Vibration", "Pressure"]
    )


def detect_anomalies(features):
    X = features[["Temperature", "Vibration", "Pressure"]]
    model = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        random_state=42,
    )
    model.fit(X)
    results = features.copy()
    results["prediction"] = model.predict(X)
    results["anomaly_score"] = -model.decision_function(X)
    return results


def create_ai_alerts(anomalies):
    alerts = []
    for _, row in anomalies.iterrows():
        alerts.append(
            {
                "machine_id": int(row["machine_id"]),
                "sensor_type": "Multi-sensor",
                "alert_type": "AI Anomaly",
                "severity": "Warning",
                "message": (
                    "AI detected an unusual combination of sensor readings. "
                    f"Temperature: {row['Temperature']:.1f} °C, "
                    f"Vibration: {row['Vibration']:.1f} mm/s, "
                    f"Pressure: {row['Pressure']:.2f} bar."
                ),
                "value": round(float(row["anomaly_score"]), 6),
                "unit": "anomaly_score",
                "created_at": row["recorded_at"],
                "resolved": False,
            }
        )
    return alerts


def insert_ai_alerts(alerts):
    inserted = 0
    skipped = 0

    with engine.begin() as connection:
        for alert in alerts:
            created_at = alert["created_at"]
            if hasattr(created_at, "to_pydatetime"):
                created_at = created_at.to_pydatetime()
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at)

            exact = connection.execute(
                text("""
                    SELECT 1 FROM alerts
                    WHERE machine_id = :machine_id
                      AND alert_type = :alert_type
                      AND created_at = :created_at
                    LIMIT 1
                """),
                {
                    "machine_id": alert["machine_id"],
                    "alert_type": alert["alert_type"],
                    "created_at": created_at,
                },
            ).first()
            if exact:
                skipped += 1
                continue

            recent = connection.execute(
                text("""
                    SELECT 1 FROM alerts
                    WHERE machine_id = :machine_id
                      AND alert_type = 'AI Anomaly'
                      AND created_at >= :cooldown_start
                      AND created_at < :created_at
                    ORDER BY created_at DESC
                    LIMIT 1
                """),
                {
                    "machine_id": alert["machine_id"],
                    "cooldown_start": created_at - timedelta(
                        seconds=AI_ALERT_COOLDOWN_SECONDS
                    ),
                    "created_at": created_at,
                },
            ).first()
            if recent:
                skipped += 1
                continue

            connection.execute(
                text("""
                    INSERT INTO alerts (
                        machine_id, sensor_type, alert_type, severity,
                        message, value, unit, created_at, resolved
                    )
                    VALUES (
                        :machine_id, :sensor_type, :alert_type, :severity,
                        :message, :value, :unit, :created_at, :resolved
                    )
                """),
                {
                    "machine_id": alert["machine_id"],
                    "sensor_type": alert["sensor_type"],
                    "alert_type": alert["alert_type"],
                    "severity": alert["severity"],
                    "message": alert["message"],
                    "value": alert["value"],
                    "unit": alert["unit"],
                    "created_at": created_at,
                    "resolved": alert["resolved"],
                },
            )
            inserted += 1

    return {"inserted": inserted, "skipped": skipped}


if __name__ == "__main__":
    df = load_sensor_data()
    features = prepare_features(df)
    results = detect_anomalies(features)
    anomalies = results[results["prediction"] == -1].sort_values(
        "anomaly_score", ascending=False
    )
    alerts = create_ai_alerts(anomalies)
    insertion = insert_ai_alerts(alerts)
    print(
        f"Anomalies detected: {len(anomalies)} | "
        f"Alerts inserted: {insertion['inserted']} | "
        f"Alerts skipped: {insertion['skipped']}"
    )
