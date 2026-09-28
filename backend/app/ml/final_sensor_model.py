from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score
from sklearn.model_selection import train_test_split


BASE_DIR = Path("data/uci_hydraulic")
PROFILE_FILE = BASE_DIR / "profile.txt"

MODEL_DIR = BASE_DIR / "models" / "final_sensor"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


TARGETS = {
    "cooler_condition": "cooler_model.joblib",
    "valve_condition": "valve_model.joblib",
    "pump_leakage": "pump_leakage_model.joblib",
    "accumulator_condition": "accumulator_model.joblib",
}


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


def load_cycle_features():

    sensor_files = {
        "temperature": [
            BASE_DIR / "TS1.txt",
            BASE_DIR / "TS2.txt",
            BASE_DIR / "TS3.txt",
            BASE_DIR / "TS4.txt",
        ],
        "pressure": [
            BASE_DIR / "PS1.txt",
            BASE_DIR / "PS2.txt",
            BASE_DIR / "PS3.txt",
            BASE_DIR / "PS4.txt",
            BASE_DIR / "PS5.txt",
            BASE_DIR / "PS6.txt",
        ],
        "vibration": [
            BASE_DIR / "VS1.txt",
        ],
    }

    all_paths = (
        sensor_files["temperature"]
        + sensor_files["pressure"]
        + sensor_files["vibration"]
    )

    handles = [open(path, "r", errors="ignore") for path in all_paths]

    rows = []

    try:
        for cycle_id, sensor_lines in enumerate(
            zip(*handles),
            start=1,
        ):

            temperature_lines = sensor_lines[0:4]
            pressure_lines = sensor_lines[4:10]
            vibration_lines = sensor_lines[10:11]

            temperature_signals = [
                np.fromstring(line, sep=" ")
                for line in temperature_lines
            ]

            pressure_signals = [
                np.fromstring(line, sep=" ")
                for line in pressure_lines
            ]

            vibration_signals = [
                np.fromstring(line, sep=" ")
                for line in vibration_lines
            ]

            temperature_signal = np.vstack(
                temperature_signals
            ).mean(axis=0)

            pressure_signal = np.vstack(
                pressure_signals
            ).mean(axis=0)

            vibration_signal = vibration_signals[0]

            row = {
                "cycle_id": cycle_id,
            }

            row.update(
                summarize_signal(
                    temperature_signal,
                    "temperature",
                )
            )

            row.update(
                summarize_signal(
                    pressure_signal,
                    "pressure",
                )
            )

            row.update(
                summarize_signal(
                    vibration_signal,
                    "vibration",
                )
            )

            rows.append(row)

    finally:
        for handle in handles:
            handle.close()

    return pd.DataFrame(rows)


def load_labels():

    profile = np.loadtxt(
        PROFILE_FILE,
        dtype=int,
    )

    if profile.ndim != 2 or profile.shape[1] != 5:
        raise ValueError(
            f"Unexpected profile shape: {profile.shape}"
        )

    return pd.DataFrame(
        profile,
        columns=[
            "cooler_condition",
            "valve_condition",
            "pump_leakage",
            "accumulator_condition",
            "stable_flag",
        ],
    )


def train_target(X, y, target_name):

    print()
    print("=" * 60)
    print(f"TRAINING: {target_name}")
    print("=" * 60)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=42,
        stratify=y,
    )

    model = RandomForestClassifier(
        n_estimators=300,
        random_state=42,
        class_weight="balanced_subsample",
        n_jobs=-1,
    )

    model.fit(
        X_train,
        y_train,
    )

    predictions = model.predict(X_test)

    accuracy = accuracy_score(
        y_test,
        predictions,
    )

    balanced_accuracy = balanced_accuracy_score(
        y_test,
        predictions,
    )

    print(f"Training samples:  {len(X_train)}")
    print(f"Testing samples:   {len(X_test)}")
    print(f"Accuracy:          {accuracy:.4f}")
    print(f"Balanced accuracy: {balanced_accuracy:.4f}")

    model_path = (
        MODEL_DIR / TARGETS[target_name]
    )

    joblib.dump(
        model,
        model_path,
    )

    print(f"Saved: {model_path}")

    return {
        "accuracy": accuracy,
        "balanced_accuracy": balanced_accuracy,
        "model_path": str(model_path),
    }


def main():

    print("=" * 60)
    print("MANUFACTURING AI")
    print("FINAL THREE-SENSOR MODEL")
    print("=" * 60)

    print()
    print("Building cycle-level sensor features...")

    sensor_df = load_cycle_features()

    labels_df = load_labels()

    if len(sensor_df) != len(labels_df):
        raise ValueError(
            f"Sensor cycles: {len(sensor_df)}, "
            f"Labels: {len(labels_df)}"
        )

    df = pd.concat(
        [
            sensor_df,
            labels_df,
        ],
        axis=1,
    )

    print(f"Total cycles: {len(df)}")

    # Use stable operating cycles for training.
    df = df[
        df["stable_flag"] == 0
    ].copy()

    print(f"Stable cycles used: {len(df)}")

    feature_columns = [
        column
        for column in sensor_df.columns
        if column != "cycle_id"
    ]

    X = df[feature_columns]

    print(f"Features: {len(feature_columns)}")

    print()
    print("Feature names:")
    print(feature_columns)

    results = {}

    for target_name in TARGETS:

        y = df[target_name].astype(int)

        results[target_name] = train_target(
            X,
            y,
            target_name,
        )

    summary = {
        target_name: {
            "accuracy": round(
                result["accuracy"],
                4,
            ),
            "balanced_accuracy": round(
                result["balanced_accuracy"],
                4,
            ),
            "model_path": result["model_path"],
        }
        for target_name, result in results.items()
    }

    summary_file = (
        MODEL_DIR /
        "training_summary.json"
    )

    with open(
        summary_file,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            summary,
            file,
            indent=4,
        )

    print()
    print("=" * 60)
    print("FINAL MODEL TRAINING COMPLETE")
    print("=" * 60)

    print(
        json.dumps(
            summary,
            indent=4,
        )
    )


if __name__ == "__main__":
    main()