from pathlib import Path

import numpy as np
import pandas as pd


BASE_DIR = Path("data/uci_hydraulic")
OUTPUT_FILE = BASE_DIR / "engineered_features.csv"

TEMPERATURE_SENSORS = ["TS1", "TS2", "TS3", "TS4"]
PRESSURE_SENSORS = ["PS1", "PS2", "PS3", "PS4", "PS5", "PS6"]
VIBRATION_SENSORS = ["VS1"]


def summarize_signal(values, prefix):
    values = np.asarray(values, dtype=float)

    return {
        f"{prefix}_mean": float(np.mean(values)),
        f"{prefix}_std": float(np.std(values)),
        f"{prefix}_min": float(np.min(values)),
        f"{prefix}_max": float(np.max(values)),
        f"{prefix}_range": float(np.ptp(values)),
        f"{prefix}_start": float(values[0]),
        f"{prefix}_end": float(values[-1]),
    }


def extract_file_features(filename, prefix):
    path = BASE_DIR / filename
    rows = []

    with open(path, "r", errors="ignore") as file:
        for line_number, line in enumerate(file, start=1):
            values = np.fromstring(line, sep=" ")

            if values.size == 0:
                raise ValueError(
                    f"{filename}: empty row at line {line_number}"
                )

            rows.append(summarize_signal(values, prefix))

    return rows


def load_profile_labels():
    path = BASE_DIR / "profile.txt"

    data = np.loadtxt(path)

    if data.ndim != 2 or data.shape[1] != 5:
        raise ValueError(
            f"profile.txt should have 5 columns, found shape {data.shape}"
        )

    return pd.DataFrame(
        data,
        columns=[
            "cooler_condition",
            "valve_condition",
            "pump_leakage",
            "accumulator_condition",
            "stable_flag",
        ],
    )


def main():
    print("=" * 60)
    print("UCI HYDRAULIC DATA FEATURE EXTRACTION")
    print("=" * 60)

    all_features = []

    sensor_files = (
        [(f"{name}.txt", name) for name in TEMPERATURE_SENSORS]
        + [(f"{name}.txt", name) for name in PRESSURE_SENSORS]
        + [(f"{name}.txt", name) for name in VIBRATION_SENSORS]
    )

    for filename, prefix in sensor_files:
        print(f"Processing {filename}...")

        rows = extract_file_features(filename, prefix)

        if not all_features:
            all_features = rows
        else:
            if len(rows) != len(all_features):
                raise ValueError(
                    f"{filename} has {len(rows)} rows, "
                    f"expected {len(all_features)}"
                )

            for index in range(len(all_features)):
                all_features[index].update(rows[index])

    sensor_df = pd.DataFrame(all_features)

    labels_df = load_profile_labels()

    if len(sensor_df) != len(labels_df):
        raise ValueError(
            f"Sensor cycles: {len(sensor_df)}, "
            f"Profile cycles: {len(labels_df)}"
        )

    final_df = pd.concat(
        [
            pd.Series(
                np.arange(1, len(sensor_df) + 1),
                name="cycle_id",
            ),
            sensor_df,
            labels_df,
        ],
        axis=1,
    )

    final_df.to_csv(OUTPUT_FILE, index=False)

    print()
    print("Feature extraction completed.")
    print(f"Cycles: {len(final_df)}")
    print(f"Features: {len(final_df.columns)}")
    print(f"Output: {OUTPUT_FILE}")
    print()
    print("Columns:")
    print(list(final_df.columns))


if __name__ == "__main__":
    main()