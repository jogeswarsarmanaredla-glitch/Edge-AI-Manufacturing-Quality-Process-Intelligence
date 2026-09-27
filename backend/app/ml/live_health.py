import joblib
import pandas as pd
import requests
from pathlib import Path


FASTAPI_URL = "http://172.19.32.1:8000"

MODEL_DIR = Path(
    "/mnt/c/ManufacturingAI/backend/"
    "data/uci_hydraulic/models/final_sensor"
)

READINGS_PER_SENSOR = 60


TARGET_MODELS = {
    "cooler_condition": MODEL_DIR / "cooler_model.joblib",
    "valve_condition": MODEL_DIR / "valve_model.joblib",
    "pump_leakage": MODEL_DIR / "pump_leakage_model.joblib",
    "accumulator_condition": MODEL_DIR / "accumulator_model.joblib",
}


def get_live_sensor_data():
    print("Connecting to FastAPI...")
    print(f"URL: {FASTAPI_URL}/api/sensors")

    response = requests.get(
        f"{FASTAPI_URL}/api/sensors",
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()

    if not data:
        raise ValueError("No sensor data received.")

    return pd.DataFrame(data)


def build_features_for_machine(machine_df):
    machine_df = machine_df.copy()

    machine_df["recorded_at"] = pd.to_datetime(
        machine_df["recorded_at"]
    )

    machine_df = machine_df.sort_values(
        "recorded_at"
    )

    result = {}

    sensor_mapping = {
        "temperature": "Temperature",
        "pressure": "Pressure",
        "vibration": "Vibration",
    }

    for feature_name, sensor_type in sensor_mapping.items():

        values = machine_df[
            machine_df["sensor_type"] == sensor_type
        ]["value"].astype(float)

        if len(values) < READINGS_PER_SENSOR:
            raise ValueError(
                f"Not enough {sensor_type} readings. "
                f"Found {len(values)}, "
                f"need {READINGS_PER_SENSOR}."
            )

        values = values.tail(
            READINGS_PER_SENSOR
        ).to_numpy()

        result[f"{feature_name}_mean"] = values.mean()
        result[f"{feature_name}_std"] = values.std()
        result[f"{feature_name}_min"] = values.min()
        result[f"{feature_name}_max"] = values.max()
        result[f"{feature_name}_range"] = (
            values.max() - values.min()
        )
        result[f"{feature_name}_start"] = values[0]
        result[f"{feature_name}_end"] = values[-1]

    return pd.DataFrame([result])


def load_models():
    models = {}

    for name, path in TARGET_MODELS.items():

        if not path.exists():
            raise FileNotFoundError(
                f"Model not found: {path}"
            )

        models[name] = joblib.load(path)

    return models


def predict_machine(models, features):

    predictions = {}

    for name, model in models.items():

        ordered_features = features[
            model.feature_names_in_
        ]

        prediction = model.predict(
            ordered_features
        )[0]

        probabilities = model.predict_proba(
            ordered_features
        )[0]

        confidence = float(
            probabilities.max()
        )

        predictions[name] = {
            "prediction": int(prediction),
            "confidence": round(
                confidence,
                4,
            ),
        }

    return predictions


def main():

    print("=" * 60)
    print("MANUFACTURING AI")
    print("LIVE MACHINE HEALTH PREDICTION")
    print("=" * 60)

    df = get_live_sensor_data()

    print(
        f"Live sensor rows received: {len(df)}"
    )

    models = load_models()

    machine_ids = sorted(
        df["machine_id"].unique()
    )

    for machine_id in machine_ids:

        print()
        print("=" * 60)
        print(
            f"MACHINE {machine_id}"
        )
        print("=" * 60)

        machine_df = df[
            df["machine_id"] == machine_id
        ]

        try:
            features = build_features_for_machine(
                machine_df
            )

            print()
            print("Live sensor summary:")

            print(
                f"Temperature: "
                f"{features['temperature_mean'].iloc[0]:.3f}"
            )

            print(
                f"Pressure:    "
                f"{features['pressure_mean'].iloc[0]:.3f}"
            )

            print(
                f"Vibration:   "
                f"{features['vibration_mean'].iloc[0]:.3f}"
            )

            predictions = predict_machine(
                models,
                features,
            )

            print()
            print("AI predictions:")

            for name, result in predictions.items():

                print(
                    f"{name}: "
                    f"{result['prediction']} "
                    f"(confidence="
                    f"{result['confidence']})"
                )

        except ValueError as error:

            print(
                f"Prediction skipped: {error}"
            )


if __name__ == "__main__":
    main()