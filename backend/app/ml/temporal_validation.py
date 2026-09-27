from pathlib import Path

import numpy as np
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
)


BASE_DIR = Path("data/uci_hydraulic")

TARGETS = [
    "cooler_condition",
    "valve_condition",
    "pump_leakage",
    "accumulator_condition",
]


def summarize_signal(values):
    return [
        float(np.mean(values)),
        float(np.std(values)),
        float(np.min(values)),
        float(np.max(values)),
        float(np.ptp(values)),
        float(values[0]),
        float(values[-1]),
    ]


def build_features():

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
        path.read_text(errors="ignore").splitlines()
        for path in temperature_files
    ]

    pressure_data = [
        path.read_text(errors="ignore").splitlines()
        for path in pressure_files
    ]

    vibration_data = vibration_file.read_text(
        errors="ignore"
    ).splitlines()

    rows = []

    for i in range(len(vibration_data)):

        temp_signals = [
            np.fromstring(
                temperature_data[j][i],
                sep=" ",
            )
            for j in range(4)
        ]

        pressure_signals = [
            np.fromstring(
                pressure_data[j][i],
                sep=" ",
            )
            for j in range(6)
        ]

        vibration_signal = np.fromstring(
            vibration_data[i],
            sep=" ",
        )

        temperature_signal = np.vstack(
            temp_signals
        ).mean(axis=0)

        pressure_signal = np.vstack(
            pressure_signals
        ).mean(axis=0)

        # 6000 pressure samples → 60 points
        pressure_signal = pressure_signal.reshape(
            60,
            100,
        ).mean(axis=1)

        features = []

        features.extend(
            summarize_signal(
                temperature_signal
            )
        )

        features.extend(
            summarize_signal(
                pressure_signal
            )
        )

        features.extend(
            summarize_signal(
                vibration_signal
            )
        )

        rows.append(features)

    return pd.DataFrame(
        rows,
        columns=[
            "temperature_mean",
            "temperature_std",
            "temperature_min",
            "temperature_max",
            "temperature_range",
            "temperature_start",
            "temperature_end",

            "pressure_mean",
            "pressure_std",
            "pressure_min",
            "pressure_max",
            "pressure_range",
            "pressure_start",
            "pressure_end",

            "vibration_mean",
            "vibration_std",
            "vibration_min",
            "vibration_max",
            "vibration_range",
            "vibration_start",
            "vibration_end",
        ],
    )


def main():

    print("=" * 70)
    print("MANUFACTURING AI")
    print("TEMPORAL HOLDOUT VALIDATION")
    print("=" * 70)

    X = build_features()

    profile = np.loadtxt(
        BASE_DIR / "profile.txt",
        dtype=int,
    )

    labels = pd.DataFrame(
        profile,
        columns=[
            "cooler_condition",
            "valve_condition",
            "pump_leakage",
            "accumulator_condition",
            "stable_flag",
        ],
    )

    df = pd.concat(
        [
            X,
            labels,
        ],
        axis=1,
    )

    # Stable operating cycles only.
    df = df[
        df["stable_flag"] == 0
    ].reset_index(drop=True)

    print(f"Stable cycles: {len(df)}")

    # Earlier 80% = training
    # Later 20% = unseen temporal holdout
    split_index = int(len(df) * 0.80)

    train_df = df.iloc[:split_index].copy()
    test_df = df.iloc[split_index:].copy()

    print(f"Training cycles: {len(train_df)}")
    print(f"Holdout cycles:  {len(test_df)}")

    feature_columns = [
        column
        for column in X.columns
    ]

    X_train = train_df[feature_columns]
    X_test = test_df[feature_columns]

    print()

    for target in TARGETS:

        print("=" * 70)
        print(f"TARGET: {target}")
        print("=" * 70)

        y_train = train_df[target].astype(int)
        y_test = test_df[target].astype(int)

        print(
            "Training classes:",
            sorted(y_train.unique()),
        )

        print(
            "Holdout classes:",
            sorted(y_test.unique()),
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

        predictions = model.predict(
            X_test
        )

        accuracy = accuracy_score(
            y_test,
            predictions,
        )

        balanced_accuracy = (
            balanced_accuracy_score(
                y_test,
                predictions,
            )
        )

        print(
            f"\nAccuracy: "
            f"{accuracy:.4f}"
        )

        print(
            f"Balanced accuracy: "
            f"{balanced_accuracy:.4f}"
        )

        print("\nClassification report:")

        print(
            classification_report(
                y_test,
                predictions,
                zero_division=0,
            )
        )


if __name__ == "__main__":
    main()