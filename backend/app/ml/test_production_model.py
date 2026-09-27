from pathlib import Path

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path("data/uci_hydraulic")
MODEL_DIR = BASE_DIR / "models" / "production_sensor"

TARGET_MODELS = {
    "cooler_condition": "cooler_model.joblib",
    "valve_condition": "valve_model.joblib",
    "pump_leakage": "pump_leakage_model.joblib",
    "accumulator_condition": "accumulator_model.joblib",
}


def load_cycle_features(cycle_number):
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

    temperature_signals = []

    for path in temperature_files:
        with open(path, "r", errors="ignore") as file:
            line = file.readlines()[cycle_number - 1]

        temperature_signals.append(
            np.fromstring(line, sep=" ")
        )

    pressure_signals = []

    for path in pressure_files:
        with open(path, "r", errors="ignore") as file:
            line = file.readlines()[cycle_number - 1]

        pressure_signals.append(
            np.fromstring(line, sep=" ")
        )

    with open(vibration_file, "r", errors="ignore") as file:
        vibration_line = file.readlines()[cycle_number - 1]

    vibration_signal = np.fromstring(
        vibration_line,
        sep=" ",
    )

    # Combine temperature channels.
    temperature_signal = np.vstack(
        temperature_signals
    ).mean(axis=0)

    # Combine pressure channels,
    # then convert 6000 samples -> 60 samples.
    pressure_signal = np.vstack(
        pressure_signals
    ).mean(axis=0)

    pressure_signal = pressure_signal.reshape(
        60,
        100,
    ).mean(axis=1)

    features = {}

    for name, values in [
        ("temperature", temperature_signal),
        ("pressure", pressure_signal),
        ("vibration", vibration_signal),
    ]:

        features[f"{name}_mean"] = float(
            np.mean(values)
        )

        features[f"{name}_std"] = float(
            np.std(values)
        )

        features[f"{name}_min"] = float(
            np.min(values)
        )

        features[f"{name}_max"] = float(
            np.max(values)
        )

        features[f"{name}_range"] = float(
            np.ptp(values)
        )

        features[f"{name}_start"] = float(
            values[0]
        )

        features[f"{name}_end"] = float(
            values[-1]
        )

    return pd.DataFrame([features])


def main():

    # Five stable cycles spread across the dataset.
    test_cycles = [
        212,
        500,
        800,
        1200,
        1600,
    ]

    profile = np.loadtxt(
        BASE_DIR / "profile.txt",
        dtype=int,
    )

    print("=" * 70)
    print("MANUFACTURING AI")
    print("PRODUCTION MODEL MULTI-CYCLE VALIDATION")
    print("=" * 70)

    total = {
        target: 0
        for target in TARGET_MODELS
    }

    correct = {
        target: 0
        for target in TARGET_MODELS
    }

    for cycle_number in test_cycles:

        actual = profile[cycle_number - 1]

        if actual[4] != 0:
            print(
                f"Skipping cycle {cycle_number}: "
                "not stable"
            )
            continue

        X = load_cycle_features(
            cycle_number
        )

        print()
        print("=" * 70)
        print(f"CYCLE {cycle_number}")
        print("=" * 70)

        for index, (target_name, filename) in enumerate(
            TARGET_MODELS.items()
        ):

            model = joblib.load(
                MODEL_DIR / filename
            )

            X_model = X[
                model.feature_names_in_
            ]

            prediction = int(
                model.predict(X_model)[0]
            )

            actual_value = int(actual[index])

            probabilities = model.predict_proba(
                X_model
            )[0]

            confidence = float(
                probabilities.max()
            )

            is_correct = (
                prediction == actual_value
            )

            total[target_name] += 1

            if is_correct:
                correct[target_name] += 1

            status = "OK" if is_correct else "MISMATCH"

            print(
                f"{target_name:22} "
                f"AI={prediction:3} "
                f"Actual={actual_value:3} "
                f"Confidence={confidence:.3f} "
                f"[{status}]"
            )

    print()
    print("=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)

    for target_name in TARGET_MODELS:

        if total[target_name] == 0:
            continue

        accuracy = (
            correct[target_name]
            / total[target_name]
        )

        print(
            f"{target_name:22} "
            f"{correct[target_name]}/"
            f"{total[target_name]} "
            f"= {accuracy:.2%}"
        )


if __name__ == "__main__":
    main()