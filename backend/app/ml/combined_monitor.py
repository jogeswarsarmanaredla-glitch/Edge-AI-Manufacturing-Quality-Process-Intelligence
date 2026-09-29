import json
import sys
from pathlib import Path

import pandas as pd
from sklearn.ensemble import IsolationForest


# ============================================================
# BACKEND PATH
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


from app.database import engine
from sqlalchemy import text

from health_score import calculate_health_score


# ============================================================
# CONFIGURATION
# ============================================================

# Minimum number of complete observations needed
# before running Isolation Forest for a machine.
MIN_HISTORY = 20

# Keep the existing anomaly-detection behavior
# but run it separately per machine.
CONTAMINATION = 0.10

# Machine -> calibrated CIRA profile
MACHINE_PROFILES = {
    1: "A",
    2: "B",
    3: "C",
    4: "A",
}


# ============================================================
# LOAD LIVE SENSOR DATA
# ============================================================

def load_sensor_data():
    """
    Load sensor data directly from PostgreSQL.

    This removes the dependency on the local WSL/FastAPI
    address and makes the ML service deployment-safe.
    """

    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    machine_id,
                    sensor_type,
                    value,
                    recorded_at
                FROM sensors
                ORDER BY recorded_at DESC, id DESC
            """)
        )

        data = result.mappings().all()

    if not data:
        raise RuntimeError(
            "No sensor data found in the database."
        )

    df = pd.DataFrame(data)

    df["recorded_at"] = pd.to_datetime(
        df["recorded_at"]
    )

    return df


# ============================================================
# PREPARE SENSOR FEATURES
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

    features = features.sort_values(
        [
            "machine_id",
            "recorded_at",
        ]
    )

    return features


# ============================================================
# MACHINE-SPECIFIC ANOMALY DETECTION
# ============================================================

def detect_latest_anomaly(machine_features):

    machine_features = machine_features.copy()

    if len(machine_features) < MIN_HISTORY:

        latest = machine_features.iloc[-1]

        return {
            "anomaly": False,
            "anomaly_score": None,
            "history_count": len(machine_features),
            "reason": (
                "Insufficient history for anomaly detection."
            ),
            "latest": latest,
        }

    X = machine_features[
        [
            "Temperature",
            "Vibration",
            "Pressure",
        ]
    ]

    model = IsolationForest(
        n_estimators=200,
        contamination=CONTAMINATION,
        random_state=42,
    )

    model.fit(X)

    machine_features["prediction"] = (
        model.predict(X)
    )

    machine_features["anomaly_score"] = (
        -model.decision_function(X)
    )

    latest = (
        machine_features
        .sort_values("recorded_at")
        .iloc[-1]
    )

    return {
        "anomaly": int(
            latest["prediction"]
        ) == -1,

        "anomaly_score": round(
            float(
                latest["anomaly_score"]
            ),
            6,
        ),

        "history_count": len(
            machine_features
        ),

        "reason": (
            "Isolation Forest detected unusual "
            "multi-sensor behavior."
            if int(
                latest["prediction"]
            ) == -1
            else
            "No Isolation Forest anomaly detected."
        ),

        "latest": latest,
    }


# ============================================================
# SENSOR REASON
# ============================================================

def get_sensor_reason(sensor_scores):

    ordered = sorted(
        sensor_scores.items(),
        key=lambda item: item[1],
    )

    sensor_name, score = ordered[0]

    # Ignore small deviations.
    if score >= 90:
        return None

    readable_name = {
        "temperature": "Temperature",
        "pressure": "Pressure",
        "vibration": "Vibration",
    }.get(
        sensor_name,
        sensor_name,
    )

    return (
        f"{readable_name} deviation detected."
    )


# ============================================================
# COMBINED DECISION
# ============================================================

def build_decision(
    health_result,
    anomaly_result,
):

    health_score = health_result[
        "health_score"
    ]

    sensor_scores = health_result[
        "sensor_scores"
    ]

    anomaly_detected = anomaly_result[
        "anomaly"
    ]

    sensor_reason = get_sensor_reason(
        sensor_scores
    )

    # --------------------------------------------------------
    # Combined status
    # --------------------------------------------------------

    if health_score < 50:
        status = "High Deviation"

    elif health_score < 75:
        status = "Inspection Recommended"

    elif anomaly_detected:
        status = "Monitor"

    elif health_score < 90:
        status = "Monitor"

    else:
        status = "Healthy"

    # --------------------------------------------------------
    # Explanation
    # --------------------------------------------------------

    if (
        anomaly_detected
        and sensor_reason
    ):

        explanation = (
            f"{sensor_reason} "
            "AI anomaly detection also identified "
            "unusual multi-sensor behavior."
        )

    elif anomaly_detected:

        explanation = (
            "AI anomaly detection identified "
            "unusual multi-sensor behavior."
        )

    elif sensor_reason:

        explanation = sensor_reason

    elif status == "Healthy":

        explanation = (
            "Machine is operating within the "
            "calibrated operating profile."
        )

    else:

        explanation = (
            "Machine condition shows a deviation "
            "from its calibrated operating profile."
        )

    # --------------------------------------------------------
    # Recommended action
    # --------------------------------------------------------

    if status == "Healthy":

        action = (
            "Continue normal monitoring."
        )

    elif status == "Monitor":

        action = (
            "Continue monitoring machine condition."
        )

    elif status == "Inspection Recommended":

        action = (
            "Inspect the machine and review "
            "recent sensor trends."
        )

    else:

        action = (
            "Inspect the machine condition "
            "before continued operation."
        )

    return {
        "status": status,
        "explanation": explanation,
        "recommended_action": action,
    }


# ============================================================
# BUILD MACHINE INSIGHTS
# ============================================================

def build_machine_insights(features):

    insights = []

    for machine_id, machine_features in (
        features.groupby("machine_id")
    ):

        machine_id = int(machine_id)

        latest = (
            machine_features
            .sort_values("recorded_at")
            .iloc[-1]
        )

        profile = MACHINE_PROFILES.get(
            machine_id,
            "A",
        )

        temperature = float(
            latest["Temperature"]
        )

        vibration = float(
            latest["Vibration"]
        )

        pressure = float(
            latest["Pressure"]
        )

        # ----------------------------------------------------
        # Health score
        # ----------------------------------------------------

        health_result = (
            calculate_health_score(
                profile,
                temperature,
                pressure,
                vibration,
            )
        )

        # ----------------------------------------------------
        # Anomaly detection
        # ----------------------------------------------------

        anomaly_result = (
            detect_latest_anomaly(
                machine_features
            )
        )

        # ----------------------------------------------------
        # Combined decision
        # ----------------------------------------------------

        decision = build_decision(
            health_result,
            anomaly_result,
        )

        insights.append(
            {
                "machine_id": machine_id,

                "profile": profile,

                "temperature": round(
                    temperature,
                    3,
                ),

                "pressure": round(
                    pressure,
                    3,
                ),

                "vibration": round(
                    vibration,
                    3,
                ),

                "health_score": (
                    health_result[
                        "health_score"
                    ]
                ),

                "health_status": (
                    health_result[
                        "status"
                    ]
                ),

                "sensor_scores": (
                    health_result[
                        "sensor_scores"
                    ]
                ),

                "anomaly_detected": (
                    anomaly_result[
                        "anomaly"
                    ]
                ),

                "anomaly_score": (
                    anomaly_result[
                        "anomaly_score"
                    ]
                ),

                "history_count": (
                    anomaly_result[
                        "history_count"
                    ]
                ),

                "combined_status": (
                    decision[
                        "status"
                    ]
                ),

                "explanation": (
                    decision[
                        "explanation"
                    ]
                ),

                "recommended_action": (
                    decision[
                        "recommended_action"
                    ]
                ),

                "recorded_at": (
                    latest["recorded_at"]
                    .isoformat()
                ),
            }
        )

    return insights


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    print(
        "=" * 70
    )

    print(
        "MANUFACTURING AI"
    )

    print(
        "COMBINED HEALTH + ANOMALY MONITOR"
    )

    print(
        "=" * 70
    )

    try:

        # ----------------------------------------------------
        # 1. Load sensor data
        # ----------------------------------------------------

        df = load_sensor_data()

        print(
            f"Sensor rows received: {len(df)}"
        )

        # ----------------------------------------------------
        # 2. Prepare features
        # ----------------------------------------------------

        features = prepare_features(
            df
        )

        print(
            f"Complete feature rows: {len(features)}"
        )

        # ----------------------------------------------------
        # 3. Build insights
        # ----------------------------------------------------

        insights = (
            build_machine_insights(
                features
            )
        )

        # ----------------------------------------------------
        # 4. Console output
        # ----------------------------------------------------

        for item in insights:

            print()

            print(
                f"Machine {item['machine_id']}"
            )

            print(
                f"Health Score: "
                f"{item['health_score']}"
            )

            print(
                f"Health Status: "
                f"{item['health_status']}"
            )

            print(
                f"Anomaly Detected: "
                f"{item['anomaly_detected']}"
            )

            print(
                f"Combined Status: "
                f"{item['combined_status']}"
            )

            print(
                f"Explanation: "
                f"{item['explanation']}"
            )

            print(
                f"Action: "
                f"{item['recommended_action']}"
            )

        # ----------------------------------------------------
        # 5. JSON output for FastAPI
        # ----------------------------------------------------

        print()

        print(
            json.dumps(
                {
                    "status": "ok",
                    "machines": insights,
                },
                indent=2,
            )
        )

    except Exception as error:

        print(
            json.dumps(
                {
                    "status": "error",
                    "message": str(error),
                    "machines": [],
                },
                indent=2,
            )
        )