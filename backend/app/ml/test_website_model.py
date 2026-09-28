from pathlib import Path

import joblib
import numpy as np
import pandas as pd


BASE_DIR = Path("data/uci_hydraulic")
DATASET_FILE = BASE_DIR / "engineered_features.csv"
MODEL_DIR = BASE_DIR / "models" / "website_sensor"


TARGET_MODELS = {
    "cooler_condition": "cooler_model.joblib",
    "valve_condition": "valve_model.joblib",
    "pump_leakage": "pump_leakage_model.joblib",
    "accumulator_condition": "accumulator_model.joblib",
}


def build_features_from_row(row):
    """
    Recreate the exact 21-feature structure used during training.
    """

    features = {}

    sensor_groups = {
        "temperature": ["TS1", "TS2", "TS3", "TS4"],
        "pressure": ["PS1", "PS2", "PS3", "PS4", "PS5", "PS6"],
        "vibration": ["VS1"],
    }

    stats = [
        "mean",
        "std",
        "min",
        "max",
        "range",
        "start",
        "end",
    ]

    for sensor_name, sensors in sensor_groups.items():

        for stat in stats:

            columns = [
                f"{sensor}_{stat}"
                for sensor in sensors
            ]

            values = row[columns].astype(float)

            if stat == "min":
                features[f"{sensor_name}_min"] = values.min()

            elif stat == "max":
                features[f"{sensor_name}_max"] = values.max()

            else:
                features[f"{sensor_name}_{stat}"] = values.mean()

    return pd.DataFrame([features])


def main():

    print("=" * 60)
    print("MANUFACTURING AI")
    print("WEBSITE MODEL REAL-CYCLE TEST")
    print("=" * 60)

    df = pd.read_csv(DATASET_FILE)

    # Pick one stable real machine cycle.
    stable_rows = df[df["stable_flag"] == 0]

    if stable_rows.empty:
        raise ValueError("No stable cycles found.")

    row = stable_rows.iloc[0]

    X = build_features_from_row(row)

    print()
    print(f"Testing cycle: {int(row['cycle_id'])}")
    print("Stable flag:", int(row["stable_flag"]))

    print()
    print("Input sensor summary:")
    print(f"Temperature: {X['temperature_mean'].iloc[0]:.3f}")
    print(f"Pressure:    {X['pressure_mean'].iloc[0]:.3f}")
    print(f"Vibration:   {X['vibration_mean'].iloc[0]:.3f}")

    print()
    print("=" * 60)
    print("AI PREDICTIONS")
    print("=" * 60)

    for target_name, model_filename in TARGET_MODELS.items():

        model_path = MODEL_DIR / model_filename

        model = joblib.load(model_path)

        # Ensure feature order exactly matches training.
        X_model = X[model.feature_names_in_]

        prediction = model.predict(X_model)[0]

        probabilities = model.predict_proba(X_model)[0]

        classes = model.classes_

        confidence = float(
            probabilities[np.argmax(probabilities)]
        )

        print()
        print(target_name)
        print(f"Prediction: {prediction}")
        print(f"Confidence: {confidence:.4f}")

        probability_text = ", ".join(
            f"{int(cls)}={prob:.3f}"
            for cls, prob in zip(classes, probabilities)
        )

        print(f"Class probabilities: {probability_text}")


if __name__ == "__main__":
    main()