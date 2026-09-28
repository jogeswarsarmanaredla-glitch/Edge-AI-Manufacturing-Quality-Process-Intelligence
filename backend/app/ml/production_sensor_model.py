from pathlib import Path
import json

import joblib
import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score
from sklearn.model_selection import train_test_split


BASE_DIR = Path("data/uci_hydraulic")
MODEL_DIR = BASE_DIR / "models" / "production_sensor"

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


def load_cycle_file(path):
    with open(path, "r", errors="ignore") as file:
        return file.readlines()


def build_features():
    print("Loading raw UCI sensor files...")

    temperature_files = [
        BASE_DIR / "TS1.txt",
        BASE_DIR / "TS2.txt",
        BASE_DIR / "TS3.txt",
        BASE_DIR / "TS4.txt",
    ]

    pressure_files = [
        BASE_DIR / "PS1.txt",
        BASE_DIR / "PS2.txt",
        BASE_DIR / "PS3.txt",
        BASE_DIR / "PS4.txt",
        BASE_DIR / "PS5.txt",
        BASE_DIR / "PS6.txt",
    ]

    vibration_file = BASE_DIR / "VS1.txt"

    temperature_data = [
        load_cycle_file(path)
        for path in temperature_files
    ]

    pressure_data = [
        load_cycle_file(path)
        for path in pressure_files
    ]

    vibration_data = load_cycle_file(vibration_file)

    number_of_cycles = len(vibration_data)

    rows = []

    for cycle_index in range(number_of_cycles):

        # ----------------------------------------------------
        # Temperature
        # 4 sensors × 60 samples
        # Combine sensor channels -> 60 points
        # ----------------------------------------------------

        temperature_signals = []

        for sensor in range(4):
            values = np.fromstring(
                temperature_data[sensor][cycle_index],
                sep=" ",
            )
            temperature_signals.append(values)

        temperature_signal = np.vstack(
            temperature_signals
        ).mean(axis=0)

        # ----------------------------------------------------
        # Pressure
        # 6 sensors × 6000 samples
        # Combine sensors -> 6000 points
        # Downsample 100 samples -> 1 point
        # Result = 60 points
        # ----------------------------------------------------

        pressure_signals = []

        for sensor in range(6):
            values = np.fromstring(
                pressure_data[sensor][cycle_index],
                sep=" ",
            )
            pressure_signals.append(values)

        pressure_signal = np.vstack(
            pressure_signals
        ).mean(axis=0)

        pressure_signal = pressure_signal.reshape(
            60,
            100,
        ).mean(axis=1)

        # ----------------------------------------------------
        # Vibration
        # Already 60 samples
        # ----------------------------------------------------

        vibration_signal = np.fromstring(
            vibration_data[cycle_index],
            sep=" ",
        )

        # ----------------------------------------------------
        # Build features
        # ----------------------------------------------------

        row = {
            "cycle_id": cycle_index + 1,
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

    return pd.DataFrame(rows)


def load_labels():
    profile = np.loadtxt(
        BASE_DIR / "profile.txt",
        dtype=int,
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


def train_model(X, y, target_name):

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

    model_path = MODEL_DIR / TARGETS[target_name]

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
    print("PRODUCTION SENSOR MODEL")
    print("=" * 60)

    print()
    print("Building deployment-compatible features...")

    sensor_df = build_features()

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

    # Use stable cycles for the first production baseline.
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

    results = {}

    for target_name in TARGETS:

        y = df[target_name].astype(int)

        results[target_name] = train_model(
            X,
            y,
            target_name,
        )

    summary = {
        name: {
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
        for name, result in results.items()
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
    print("PRODUCTION MODEL TRAINING COMPLETE")
    print("=" * 60)

    print(
        json.dumps(
            summary,
            indent=4,
        )
    )


if __name__ == "__main__":
    main()