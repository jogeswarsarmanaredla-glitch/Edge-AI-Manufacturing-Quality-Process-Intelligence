from pathlib import Path
import json

import pandas as pd


BASE_DIR = Path("data/cira_pump")
OUTPUT_FILE = BASE_DIR / "baseline_profiles.json"

PUMPS = ["A", "B", "C"]


def build_profile(pump):
    file_path = BASE_DIR / f"{pump}_2024-04-10.csv"

    if not file_path.exists():
        raise FileNotFoundError(
            f"Missing file: {file_path}"
        )

    df = pd.read_csv(file_path)

    pressure_column = f"{pump}_Pres.PV"
    motor_vibration_column = f"{pump}_ACR_Mot.PV"
    pump_vibration_column = f"{pump}_ACR_Pmp.PV"
    motor_temperature_column = f"{pump}_ACR_Mot.TV"
    pump_temperature_column = f"{pump}_ACR_Pmp.TV"

    # This threshold is ONLY used to isolate the
    # high-pressure operating state in these files.
    # It is NOT a safety limit.
    operating = df[
        df[pressure_column] > 30
    ].copy()

    if operating.empty:
        raise ValueError(
            f"No operating-state data found for pump {pump}."
        )

    # Website units:
    # pressure      -> bar
    # temperature   -> °C
    # vibration     -> mm/s
    motor_vibration = (
        operating[motor_vibration_column] * 1000
    )

    pump_vibration = (
        operating[pump_vibration_column] * 1000
    )

    # Use the two accelerometer contact temperatures
    # as the machine temperature reference.
    machine_temperature = operating[
        [
            motor_temperature_column,
            pump_temperature_column,
        ]
    ].mean(axis=1)

    machine_vibration = pd.concat(
        [
            motor_vibration.rename("motor"),
            pump_vibration.rename("pump"),
        ],
        axis=1,
    ).mean(axis=1)

    pressure = operating[pressure_column]

    profile = {
        "pump": pump,
        "source_file": file_path.name,
        "operating_rows": int(len(operating)),

        "temperature_c": {
            "p05": round(float(machine_temperature.quantile(0.05)), 4),
            "median": round(float(machine_temperature.median()), 4),
            "p95": round(float(machine_temperature.quantile(0.95)), 4),
        },

        "pressure_bar": {
            "p05": round(float(pressure.quantile(0.05)), 4),
            "median": round(float(pressure.median()), 4),
            "p95": round(float(pressure.quantile(0.95)), 4),
        },

        "vibration_mm_s": {
            "p05": round(float(machine_vibration.quantile(0.05)), 4),
            "median": round(float(machine_vibration.median()), 4),
            "p95": round(float(machine_vibration.quantile(0.95)), 4),
        },
    }

    return profile


def main():
    print("=" * 70)
    print("MANUFACTURING AI")
    print("CIRA BASELINE PROFILE BUILDER")
    print("=" * 70)

    profiles = {}

    for pump in PUMPS:
        print()
        print(f"Building profile for Pump {pump}...")

        profiles[pump] = build_profile(pump)

        print(
            json.dumps(
                profiles[pump],
                indent=4,
            )
        )

    with open(
        OUTPUT_FILE,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            profiles,
            file,
            indent=4,
        )

    print()
    print("=" * 70)
    print("BASELINE PROFILES CREATED")
    print("=" * 70)
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()