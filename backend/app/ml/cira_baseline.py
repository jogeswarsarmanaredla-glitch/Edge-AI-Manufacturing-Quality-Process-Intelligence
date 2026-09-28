from pathlib import Path

import pandas as pd


BASE_DIR = Path("data/cira_pump")


PUMPS = ["A", "B", "C"]


def analyze_pump(pump):
    file_path = BASE_DIR / f"{pump}_2024-04-10.csv"

    if not file_path.exists():
        raise FileNotFoundError(
            f"Missing file: {file_path}"
        )

    df = pd.read_csv(file_path)

    pressure_col = f"{pump}_Pres.PV"
    motor_vibration_col = f"{pump}_ACR_Mot.PV"
    pump_vibration_col = f"{pump}_ACR_Pmp.PV"
    motor_temp_col = f"{pump}_ACR_Mot.TV"
    pump_temp_col = f"{pump}_ACR_Pmp.TV"

    # Pressure > 1 bar is used only as an operating-state
    # proxy for this exploratory analysis.
    active = df[pressure_col] > 1

    operating = df.loc[active].copy()

    print()
    print("=" * 70)
    print(f"PUMP {pump}")
    print("=" * 70)

    print(f"Total rows:     {len(df)}")
    print(f"Operating rows: {len(operating)}")

    if operating.empty:
        print("No operating rows found.")
        return

    print()
    print("Operating pressure:")

    print(
        operating[pressure_col]
        .describe(
            percentiles=[
                0.05,
                0.25,
                0.50,
                0.75,
                0.95,
            ]
        )
        .to_string()
    )

    print()
    print("Operating vibration:")

    vibration_stats = operating[
        [
            motor_vibration_col,
            pump_vibration_col,
        ]
    ].describe(
        percentiles=[
            0.05,
            0.25,
            0.50,
            0.75,
            0.95,
        ]
    )

    print(vibration_stats.to_string())

    print()
    print("Operating temperature:")

    temperature_stats = operating[
        [
            motor_temp_col,
            pump_temp_col,
        ]
    ].describe(
        percentiles=[
            0.05,
            0.25,
            0.50,
            0.75,
            0.95,
        ]
    )

    print(temperature_stats.to_string())

    print()
    print("Missing values during operation:")

    print(
        operating[
            [
                pressure_col,
                motor_vibration_col,
                pump_vibration_col,
                motor_temp_col,
                pump_temp_col,
            ]
        ]
        .isna()
        .sum()
        .to_string()
    )


def main():

    print("=" * 70)
    print("MANUFACTURING AI")
    print("CIRA INDUSTRIAL PUMP BASELINE")
    print("=" * 70)

    for pump in PUMPS:
        analyze_pump(pump)

    print()
    print("=" * 70)
    print("BASELINE ANALYSIS COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()