import random
import time
from datetime import datetime
from pathlib import Path

import requests


FASTAPI_URL = "http://172.19.32.1:8000"

BASE_DIR = Path("/mnt/c/ManufacturingAI/backend")
PROFILE_FILE = (
    BASE_DIR / "data" / "cira_pump" / "baseline_profiles.json"
)

MACHINE_PROFILES = {
    1: "A",
    2: "B",
    3: "C",
}


def load_profiles():
    import json

    with open(
        PROFILE_FILE,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


PROFILES = load_profiles()


def get_profile(machine_id):
    if machine_id in MACHINE_PROFILES:
        return PROFILES[MACHINE_PROFILES[machine_id]]

    # Machine 4 = synthetic prototype profile.
    pumps = [
        PROFILES["A"],
        PROFILES["B"],
        PROFILES["C"],
    ]

    return {
        "temperature_c": {
            "p05": sum(
                p["temperature_c"]["p05"]
                for p in pumps
            ) / len(pumps),

            "median": sum(
                p["temperature_c"]["median"]
                for p in pumps
            ) / len(pumps),

            "p95": sum(
                p["temperature_c"]["p95"]
                for p in pumps
            ) / len(pumps),
        },

        "pressure_bar": {
            "p05": sum(
                p["pressure_bar"]["p05"]
                for p in pumps
            ) / len(pumps),

            "median": sum(
                p["pressure_bar"]["median"]
                for p in pumps
            ) / len(pumps),

            "p95": sum(
                p["pressure_bar"]["p95"]
                for p in pumps
            ) / len(pumps),
        },

        "vibration_mm_s": {
            "p05": sum(
                p["vibration_mm_s"]["p05"]
                for p in pumps
            ) / len(pumps),

            "median": sum(
                p["vibration_mm_s"]["median"]
                for p in pumps
            ) / len(pumps),

            "p95": sum(
                p["vibration_mm_s"]["p95"]
                for p in pumps
            ) / len(pumps),
        },
    }


def generate_reading(machine_id):

    profile = get_profile(machine_id)

    temp = profile["temperature_c"]
    pressure = profile["pressure_bar"]
    vibration = profile["vibration_mm_s"]

    # Small natural variation around the real baseline.
    temperature = random.gauss(
        temp["median"],
        max((temp["p95"] - temp["p05"]) / 8, 0.02),
    )

    pressure_value = random.gauss(
        pressure["median"],
        max((pressure["p95"] - pressure["p05"]) / 8, 0.005),
    )

    vibration_value = random.gauss(
        vibration["median"],
        max((vibration["p95"] - vibration["p05"]) / 8, 0.01),
    )

    # Simulate an occasional abnormal condition.
    abnormal = random.random() < 0.10

    if abnormal:

        failure_type = random.choice(
            [
                "temperature",
                "pressure",
                "vibration",
                "combined",
            ]
        )

        if failure_type in {"temperature", "combined"}:
            temperature += max(
                (temp["p95"] - temp["p05"]) * 1.5,
                2.0,
            )

        if failure_type in {"pressure", "combined"}:
            pressure_value += max(
                (pressure["p95"] - pressure["p05"]) * 3,
                2.0,
            )

        if failure_type in {"vibration", "combined"}:
            vibration_value += max(
                (vibration["p95"] - vibration["p05"]) * 4,
                1.0,
            )

    return {
        "machine_id": machine_id,
        "temperature": round(
            temperature,
            3,
        ),
        "pressure": round(
            pressure_value,
            3,
        ),
        "vibration": round(
            vibration_value,
            3,
        ),
        "abnormal": abnormal,
        "recorded_at": datetime.now().isoformat(),
    }


def send_reading(machine_id):

    reading = generate_reading(
        machine_id
    )

    payload = {
        "machine_id": reading["machine_id"],
        "temperature": reading["temperature"],
        "vibration": reading["vibration"],
        "pressure": reading["pressure"],
        "recorded_at": reading["recorded_at"],
    }

    response = requests.post(
        f"{FASTAPI_URL}/api/simulate-sensor",
        json=payload,
        timeout=10,
    )

    response.raise_for_status()

    state = "ABNORMAL" if reading["abnormal"] else "NORMAL"

    print(
        f"Machine {machine_id} | "
        f"{state} | "
        f"T={reading['temperature']} °C | "
        f"V={reading['vibration']} mm/s | "
        f"P={reading['pressure']} bar"
    )


if __name__ == "__main__":

    print("=" * 60)
    print("MANUFACTURING AI")
    print("CIRA-CALIBRATED SENSOR SIMULATOR")
    print("=" * 60)

    print()
    print("Machine mapping:")
    print("Machine 1 -> CIRA Pump A profile")
    print("Machine 2 -> CIRA Pump B profile")
    print("Machine 3 -> CIRA Pump C profile")
    print("Machine 4 -> Synthetic average profile")

    print()
    print("Starting simulator...")
    print("Press Ctrl+C to stop.")

    while True:

        for machine_id in [1, 2, 3, 4]:

            try:
                send_reading(machine_id)

            except requests.RequestException as error:
                print(
                    f"Machine {machine_id} "
                    f"request failed: {error}"
                )

        time.sleep(5)