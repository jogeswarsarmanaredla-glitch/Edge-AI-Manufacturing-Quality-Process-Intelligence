import requests
import pandas as pd

from health_score import calculate_health_score


FASTAPI_URL = "http://172.19.32.1:8000"

READINGS_PER_SENSOR = 12

MACHINE_TO_PROFILE = {
    1: "A",
    2: "B",
    3: "C",
    4: "A",   # Machine 4 uses the synthetic prototype profile for now.
}


def get_live_sensor_data():
    response = requests.get(
        f"{FASTAPI_URL}/api/sensors",
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()

    if not data:
        raise ValueError("No sensor data received.")

    return pd.DataFrame(data)


def get_recent_sensor_values(machine_df):
    machine_df = machine_df.copy()

    machine_df["recorded_at"] = pd.to_datetime(
        machine_df["recorded_at"]
    )

    machine_df = machine_df.sort_values(
        "recorded_at"
    )

    result = {}

    for sensor_type in [
        "Temperature",
        "Pressure",
        "Vibration",
    ]:

        values = machine_df[
            machine_df["sensor_type"] == sensor_type
        ]["value"].astype(float)

        if len(values) < READINGS_PER_SENSOR:
            raise ValueError(
                f"Not enough {sensor_type} readings."
            )

        recent_values = values.tail(
            READINGS_PER_SENSOR
        )

        result[sensor_type] = float(
            recent_values.mean()
        )

    return result


def main():

    print("=" * 70)
    print("MANUFACTURING AI")
    print("LIVE MACHINE HEALTH SCORE")
    print("=" * 70)

    df = get_live_sensor_data()

    print(
        f"Live sensor rows received: {len(df)}"
    )

    for machine_id in sorted(
        df["machine_id"].unique()
    ):

        machine_id = int(machine_id)

        if machine_id not in MACHINE_TO_PROFILE:
            print(
                f"\nMachine {machine_id}: "
                "No baseline profile configured."
            )
            continue

        profile = MACHINE_TO_PROFILE[machine_id]

        machine_df = df[
            df["machine_id"] == machine_id
        ]

        try:
            values = get_recent_sensor_values(
                machine_df
            )

            temperature = values["Temperature"]
            pressure = values["Pressure"]
            vibration = values["Vibration"]

            result = calculate_health_score(
                pump=profile,
                temperature=temperature,
                pressure=pressure,
                vibration=vibration,
            )

            print()
            print("=" * 70)
            print(
                f"MACHINE {machine_id} "
                f"(Profile {profile})"
            )
            print("=" * 70)

            print(
                f"Temperature: {temperature:.3f} °C"
            )

            print(
                f"Pressure:    {pressure:.3f} bar"
            )

            print(
                f"Vibration:   {vibration:.3f} mm/s"
            )

            print()
            print(
                f"Temperature score: "
                f"{result['sensor_scores']['temperature']:.2f}"
            )

            print(
                f"Pressure score:    "
                f"{result['sensor_scores']['pressure']:.2f}"
            )

            print(
                f"Vibration score:   "
                f"{result['sensor_scores']['vibration']:.2f}"
            )

            print()
            print(
                f"HEALTH SCORE: "
                f"{result['health_score']:.2f}"
            )

            print(
                f"STATUS: "
                f"{result['status']}"
            )

        except ValueError as error:

            print(
                f"\nMachine {machine_id}: "
                f"{error}"
            )


if __name__ == "__main__":
    main()