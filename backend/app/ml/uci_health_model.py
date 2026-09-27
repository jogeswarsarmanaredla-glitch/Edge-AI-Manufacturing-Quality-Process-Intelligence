from pathlib import Path
import json

import joblib
import pandas as pd

from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
)
from sklearn.model_selection import train_test_split


BASE_DIR = Path("data/uci_hydraulic")
DATASET_FILE = BASE_DIR / "engineered_features.csv"
MODEL_DIR = BASE_DIR / "models"

MODEL_DIR.mkdir(parents=True, exist_ok=True)


TARGETS = {
    "cooler_condition": "cooler_model.joblib",
    "valve_condition": "valve_model.joblib",
    "pump_leakage": "pump_leakage_model.joblib",
    "accumulator_condition": "accumulator_model.joblib",
}


def load_dataset():
    print("Loading engineered dataset...")

    df = pd.read_csv(DATASET_FILE)

    if df.empty:
        raise ValueError("The engineered dataset is empty.")

    return df


def get_sensor_features(df):
    """
    Keep only temperature, pressure, and vibration features.

    This is intentional because these are the three sensor
    categories used by our current website.
    """

    feature_columns = [
        column
        for column in df.columns
        if (
            column.startswith("TS")
            or column.startswith("PS")
            or column.startswith("VS")
        )
    ]

    if not feature_columns:
        raise ValueError("No sensor feature columns were found.")

    return df[feature_columns], feature_columns


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

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)

    accuracy = accuracy_score(y_test, predictions)
    balanced_accuracy = balanced_accuracy_score(y_test, predictions)

    print(f"Training samples: {len(X_train)}")
    print(f"Testing samples:  {len(X_test)}")
    print(f"Accuracy:         {accuracy:.4f}")
    print(f"Balanced accuracy:{balanced_accuracy:.4f}")

    print()
    print("Classification report:")
    print(
        classification_report(
            y_test,
            predictions,
            zero_division=0,
        )
    )

    model_path = MODEL_DIR / TARGETS[target_name]
    joblib.dump(model, model_path)

    print(f"Model saved to: {model_path}")

    return {
        "model": model,
        "accuracy": accuracy,
        "balanced_accuracy": balanced_accuracy,
        "model_path": str(model_path),
    }


def main():
    print("=" * 60)
    print("MANUFACTURING AI - UCI CONDITION MODEL")
    print("=" * 60)

    df = load_dataset()

    print(f"Dataset rows: {len(df)}")
    print(f"Dataset columns: {len(df.columns)}")

    X, feature_columns = get_sensor_features(df)

    print(f"Sensor features used: {len(feature_columns)}")
    print()

    results = {}

    for target_name in TARGETS:
        y = df[target_name].astype(int)

        results[target_name] = train_model(
            X,
            y,
            target_name,
        )

    summary = {}

    for target_name, result in results.items():
        summary[target_name] = {
            "accuracy": round(result["accuracy"], 4),
            "balanced_accuracy": round(
                result["balanced_accuracy"],
                4,
            ),
            "model_path": result["model_path"],
        }

    summary_file = MODEL_DIR / "training_summary.json"

    with open(summary_file, "w", encoding="utf-8") as file:
        json.dump(
            summary,
            file,
            indent=4,
        )

    print()
    print("=" * 60)
    print("TRAINING COMPLETED")
    print("=" * 60)

    print(json.dumps(summary, indent=4))

    print()
    print(f"Models saved in: {MODEL_DIR}")


if __name__ == "__main__":
    main()