import json
import sys

import pandas as pd
import requests

from health_score import calculate_health_score


FASTAPI_URL = "http://172.19.32.1:8000"

READINGS_PER_SENSOR = 12

MACHINE_TO_PROFILE = {
    1: "A",
    2: "B",
    3: "C",
    4: "A",  # Synthetic prototype profile for Machine 4.
}


def get_live_sensor_data():
    response = requests.get(
        f"{FASTAPI_URL}/api/sensors",
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()

    if not data:
        raise ValueError("No sensor data received.")

    return pd.DataFrame(data)


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