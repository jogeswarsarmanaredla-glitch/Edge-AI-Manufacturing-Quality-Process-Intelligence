from pathlib import Path

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path("data/uci_hydraulic")
MODEL_DIR = BASE_DIR / "models" / "final_sensor"

TARGET_MODELS = {
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


def load_cycle_features(cycle_number):
    temp_paths = [
        BASE_DIR / "TS1.txt",
        BASE_DIR / "TS2.txt",
        BASE_DIR / "TS3.txt",
        BASE_DIR / "TS4.txt",
    ]

    pressure_paths = [
        BASE_DIR / "PS1.txt",
        BASE_DIR / "PS2.txt",
        BASE_DIR / "PS3.txt",
        BASE_DIR / "PS4.txt",
        BASE_DIR / "PS5.txt",
        BASE_DIR / "PS6.txt",
    ]

    vibration_path = BASE_DIR / "VS1.txt"

    temp_signals = []
    for path in temp_paths:
        with open(path, "r", errors="ignore") as file:
            line = file.readlines()[cycle_number - 1]
        temp_signals.append(np.fromstring(line, sep=" "))

    pressure_signals = []
    for path in pressure_paths:
        with open(path, "r", errors="ignore") as file:
            line = file.readlines()[cycle_number - 1]
        pressure_signals.append(np.fromstring(line, sep=" "))

    with open(vibration_path, "r", errors="ignore") as file:
        vibration_line = file.readlines()[cycle_number - 1]

    vibration_signal = np.fromstring(
        vibration_line,
        sep=" ",
    )

    temperature_signal = np.vstack(
        temp_signals
    ).mean(axis=0)

    pressure_signal = np.vstack(
        pressure_signals
    ).mean(axis=0)

    features = {}

    features.update(
        summarize_signal(
            temperature_signal,
            "temperature",
        )
    )

    features.update(
        summarize_signal(
            pressure_signal,
            "pressure",
        )
    )

    features.update(
        summarize_signal(
            vibration_signal,
            "vibration",
        )
    )

    return pd.DataFrame([features])


def main():

    cycle_number = 212

    print("=" * 60)
    print("FINAL MODEL - REAL UCI CYCLE TEST")
    print("=" * 60)

    X = load_cycle_features(cycle_number)

    print()
    print(f"Testing UCI cycle: {cycle_number}")

    print()
    print("Sensor summary:")
    print(
        f"Temperature: "
        f"{X['temperature_mean'].iloc[0]:.3f}"
    )
    print(
        f"Pressure:    "
        f"{X['pressure_mean'].iloc[0]:.3f}"
    )
    print(
        f"Vibration:   "
        f"{X['vibration_mean'].iloc[0]:.3f}"
    )

    labels = np.loadtxt(
        BASE_DIR / "profile.txt",
        dtype=int,
    )[cycle_number - 1]

    print()
    print("AI PREDICTIONS")
    print("-" * 60)

    for target_name, filename in TARGET_MODELS.items():

        model = joblib.load(
            MODEL_DIR / filename
        )

        X_model = X[model.feature_names_in_]

        prediction = model.predict(X_model)[0]

        probabilities = model.predict_proba(X_model)[0]

        confidence = float(
            probabilities.max()
        )

        print()
        print(f"{target_name}")
        print(f"Prediction: {prediction}")
        print(f"Confidence: {confidence:.4f}")

    print()
    print("ACTUAL UCI LABELS")
    print("-" * 60)

    print(
        "Cooler:      ",
        labels[0],
    )
    print(
        "Valve:       ",
        labels[1],
    )
    print(
        "Pump leak:   ",
        labels[2],
    )
    print(
        "Accumulator: ",
        labels[3],
    )

    print()
    print("Stable flag:", labels[4])


if __name__ == "__main__":
    main()