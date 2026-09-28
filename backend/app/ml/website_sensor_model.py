from pathlib import Path
import json

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score
from sklearn.model_selection import train_test_split


BASE_DIR = Path("data/uci_hydraulic")
DATASET_FILE = BASE_DIR / "engineered_features.csv"

MODEL_DIR = BASE_DIR / "models" / "website_sensor"
MODEL_DIR.mkdir(parents=True, exist_ok=True)


TARGETS = {
    "cooler_condition": "cooler_model.joblib",
    "valve_condition": "valve_model.joblib",
    "pump_leakage": "pump_leakage_model.joblib",
    "accumulator_condition": "accumulator_model.joblib",
}


STATS = [
    "mean",
    "std",
    "min",
    "max",
    "range",
    "start",
    "end",
]


def build_website_features(df):
    """
    Convert the UCI multi-channel data into the same
    three sensor categories used by our website:

        Temperature
        Pressure
        Vibration

    Each category gets 7 statistical features.
    Total = 21 features.
    """

    sensor_groups = {
        "temperature": ["TS1", "TS2", "TS3", "TS4"],
        "pressure": ["PS1", "PS2", "PS3", "PS4", "PS5", "PS6"],
        "vibration": ["VS1"],
    }

    result = pd.DataFrame(index=df.index)

    for sensor_name, sensors in sensor_groups.items():

        for stat in STATS:

            columns = [
                f"{sensor}_{stat}"
                for sensor in sensors
            ]

            if stat == "min":
                result[f"{sensor_name}_min"] = df[columns].min(axis=1)

            elif stat == "max":
                result[f"{sensor_name}_max"] = df[columns].max(axis=1)

            else:
                result[f"{sensor_name}_{stat}"] = df[columns].mean(axis=1)

    return result


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

    model.fit(X_train, y_train)

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

    joblib.dump(model, model_path)

    print(f"Saved model: {model_path}")

    return {
        "accuracy": accuracy,
        "balanced_accuracy": balanced_accuracy,
        "model_path": str(model_path),
    }


def main():

    print("=" * 60)
    print("MANUFACTURING AI")
    print("3-SENSOR WEBSITE MODEL")
    print("=" * 60)

    df = pd.read_csv(DATASET_FILE)

    print(f"Original cycles: {len(df)}")

    # Use only stable operating cycles for the first model.
    # stable_flag = 0 means stable operating conditions.
    df = df[df["stable_flag"] == 0].copy()

    print(f"Stable cycles used: {len(df)}")

    X = build_website_features(df)

    print(f"Website features: {len(X.columns)}")
    print()
    print("Features:")
    print(list(X.columns))

    results = {}

    for target_name in TARGETS:

        y = df[target_name].astype(int)

        results[target_name] = train_target(
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
    print("WEBSITE SENSOR MODEL TRAINING COMPLETE")
    print("=" * 60)

    print(json.dumps(
        summary,
        indent=4,
    ))


if __name__ == "__main__":
    main()