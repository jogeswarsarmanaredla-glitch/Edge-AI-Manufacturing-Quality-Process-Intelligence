from pathlib import Path
import json

import numpy as np
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score
from sklearn.model_selection import train_test_split


BASE_DIR = Path("data/uci_hydraulic")
DATASET_FILE = BASE_DIR / "engineered_features.csv"
MODEL_DIR = BASE_DIR / "models"

DEPLOYMENT_MODEL_DIR = MODEL_DIR / "deployment"
DEPLOYMENT_MODEL_DIR.mkdir(parents=True, exist_ok=True)


TARGETS = {
    "cooler_condition": "deployment_cooler_model.joblib",
    "valve_condition": "deployment_valve_model.joblib",
    "pump_leakage": "deployment_pump_leakage_model.joblib",
    "accumulator_condition": "deployment_accumulator_model.joblib",
}


def build_deployment_features(df):
    """
    Build features representing the three sensor categories
    used by our current website:

    Temperature
    Pressure
    Vibration
    """

    feature_groups = {
        "temperature": [
            c for c in df.columns
            if c.startswith("TS")
        ],
        "pressure": [
            c for c in df.columns
            if c.startswith("PS")
        ],
        "vibration": [
            c for c in df.columns
            if c.startswith("VS")
        ],
    }

    result = pd.DataFrame(index=df.index)

    for sensor_name, columns in feature_groups.items():

        # Mean across the available sensor channels
        result[f"{sensor_name}_mean"] = df[columns].mean(axis=1)

        # Variation across channels/features
        result[f"{sensor_name}_std"] = df[columns].std(axis=1)

        result[f"{sensor_name}_min"] = df[columns].min(axis=1)

        result[f"{sensor_name}_max"] = df[columns].max(axis=1)

    return result


def train_target(X, y, target_name):

    print()
    print("=" * 60)
    print(f"TRAINING DEPLOYMENT MODEL: {target_name}")
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

    accuracy = accuracy_score(y_test, predictions)
    balanced_accuracy = balanced_accuracy_score(
        y_test,
        predictions,
    )

    print(f"Training samples:  {len(X_train)}")
    print(f"Testing samples:   {len(X_test)}")
    print(f"Accuracy:          {accuracy:.4f}")
    print(f"Balanced accuracy: {balanced_accuracy:.4f}")

    model_path = DEPLOYMENT_MODEL_DIR / TARGETS[target_name]

    joblib.dump(model, model_path)

    print(f"Saved: {model_path}")

    return {
        "accuracy": accuracy,
        "balanced_accuracy": balanced_accuracy,
        "model_path": str(model_path),
    }


def main():

    print("=" * 60)
    print("MANUFACTURING AI")
    print("WEBSITE-COMPATIBLE SENSOR MODEL")
    print("=" * 60)

    df = pd.read_csv(DATASET_FILE)

    print(f"Dataset rows: {len(df)}")

    X = build_deployment_features(df)

    print(f"Deployment features: {len(X.columns)}")
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
            "accuracy": round(result["accuracy"], 4),
            "balanced_accuracy": round(
                result["balanced_accuracy"],
                4,
            ),
            "model_path": result["model_path"],
        }
        for name, result in results.items()
    }

    summary_path = (
        DEPLOYMENT_MODEL_DIR /
        "deployment_training_summary.json"
    )

    with open(summary_path, "w", encoding="utf-8") as file:
        json.dump(summary, file, indent=4)

    print()
    print("=" * 60)
    print("DEPLOYMENT MODEL TRAINING COMPLETE")
    print("=" * 60)

    print(json.dumps(summary, indent=4))


if __name__ == "__main__":
    main()