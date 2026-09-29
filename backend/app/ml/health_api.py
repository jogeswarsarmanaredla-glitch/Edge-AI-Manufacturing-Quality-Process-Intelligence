import json
import sys
from pathlib import Path

import pandas as pd
from sqlalchemy import text

# ------------------------------------------------------------
# Make backend/ importable when this file is executed directly.
# ------------------------------------------------------------

BACKEND_DIR = Path(__file__).resolve().parents[2]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.database import engine
from app.ml.health_score import calculate_health_score


READINGS_PER_SENSOR = 12

MACHINE_TO_PROFILE = {
    1: "A",
    2: "B",
    3: "C",
    4: "A",  # Synthetic prototype profile for Machine 4.
}


# ============================================================
# LOAD LIVE SENSOR DATA
# ============================================================

def get_live_sensor_data():
    """
    Read sensor data directly from PostgreSQL.

    This avoids depending on a local/WSL FastAPI address,
    making the health service suitable for deployment.
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
        raise ValueError(
            "No sensor data found in the database."
        )

    return pd.DataFrame(data)


# ============================================================
# GET RECENT SENSOR VALUES
# ============================================================

def get_recent_sensor_values(machine_df):
    machine_df = machine_df.copy()

    machine_df["recorded_at"] = pd.to_datetime(
        machine_df["recorded_at"]
    )

    machine_df = machine_df.sort_values(
        "recorded_at"
    )

    result = {}

    for sensor_type in [
        "Temperature",
        "Pressure",
        "Vibration",
    ]:
        values = machine_df[
            machine_df["sensor_type"] == sensor_type
        ]["value"].astype(float)

        if len(values) < READINGS_PER_SENSOR:
            raise ValueError(
                f"Not enough {sensor_type} readings."
            )

        recent_values = values.tail(
            READINGS_PER_SENSOR
        )

        result[sensor_type] = float(
            recent_values.mean()
        )

    return result


# ============================================================
# BUILD HEALTH RESULTS
# ============================================================

def build_health_results():
    df = get_live_sensor_data()

    results = []

    for machine_id in sorted(
        df["machine_id"].unique()
    ):
        machine_id = int(machine_id)

        if machine_id not in MACHINE_TO_PROFILE:
            continue

        machine_df = df[
            df["machine_id"] == machine_id
        ]

        values = get_recent_sensor_values(
            machine_df
        )

        profile = MACHINE_TO_PROFILE[machine_id]

        health = calculate_health_score(
            pump=profile,
            temperature=values["Temperature"],
            pressure=values["Pressure"],
            vibration=values["Vibration"],
        )

        results.append(
            {
                "machine_id": machine_id,
                "profile": profile,

                "temperature": round(
                    values["Temperature"],
                    3,
                ),

                "pressure": round(
                    values["Pressure"],
                    3,
                ),

                "vibration": round(
                    values["Vibration"],
                    3,
                ),

                "health_score": health["health_score"],

                "status": health["status"],

                "sensor_scores": health["sensor_scores"],
            }
        )

    return {
        "status": "ok",
        "machines": results,
    }


# ============================================================
# MAIN
# ============================================================

def main():
    try:
        result = build_health_results()

        print(
            json.dumps(
                result,
                separators=(",", ":"),
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
                separators=(",", ":"),
            )
        )

        sys.exit(1)


if __name__ == "__main__":
    main()