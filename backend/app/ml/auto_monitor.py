import time

import pandas as pd

from app.ml.anomaly import (
    load_sensor_data,
    prepare_features,
    detect_anomalies,
    create_ai_alerts,
    send_alerts_to_backend,
)


# ============================================================
# CONFIGURATION
# ============================================================

MONITOR_INTERVAL_SECONDS = 20

# Number of recent timestamp groups to analyze per machine
RECENT_OBSERVATIONS_PER_MACHINE = 30


# ============================================================
# KEEP ONLY RECENT MACHINE DATA
# ============================================================

def get_recent_sensor_window(df):
    df = df.copy()

    df["recorded_at"] = pd.to_datetime(
        df["recorded_at"]
    )

    df = df.sort_values(
        ["machine_id", "recorded_at"]
    )

    recent_groups = []

    for machine_id, machine_df in df.groupby(
        "machine_id"
    ):
        timestamps = (
            machine_df["recorded_at"]
            .drop_duplicates()
            .sort_values()
            .tail(
                RECENT_OBSERVATIONS_PER_MACHINE
            )
        )

        recent_machine_df = machine_df[
            machine_df["recorded_at"].isin(
                timestamps
            )
        ]

        recent_groups.append(
            recent_machine_df
        )

    if not recent_groups:
        return df.iloc[0:0]

    return pd.concat(
        recent_groups,
        ignore_index=True,
    )


# ============================================================
# ONE AI MONITORING CYCLE
# ============================================================

def run_monitor_cycle():
    print("\n================================")
    print("AUTOMATIC AI MONITORING CYCLE")
    print("================================")

    try:
        # 1. Load live sensor data
        df = load_sensor_data()

        print(
            f"Total sensor rows available: {len(df)}"
        )

        # 2. Keep only recent machine data
        recent_df = get_recent_sensor_window(
            df
        )

        print(
            f"Recent sensor rows analyzed: {len(recent_df)}"
        )

        # 3. Prepare ML features
        features = prepare_features(
            recent_df
        )

        print(
            f"Recent ML observations: {len(features)}"
        )

        # 4. Run Isolation Forest
        results = detect_anomalies(
            features
        )

        # 5. Keep anomalies
        anomalies = results[
            results["prediction"] == -1
        ].sort_values(
            "anomaly_score",
            ascending=False,
        )

        print(
            f"Anomalies detected in recent window: "
            f"{len(anomalies)}"
        )

        # 6. Create alert payloads
        ai_alerts = create_ai_alerts(
            anomalies
        )

        # 7. Send to FastAPI
        if ai_alerts:
            send_alerts_to_backend(
                ai_alerts
            )
        else:
            print(
                "\nNo new anomalies detected "
                "in the recent window."
            )

    except Exception as error:
        print(
            "\nAI monitoring cycle failed."
        )

        print(
            f"Error: {error}"
        )


# ============================================================
# CONTINUOUS MONITORING
# ============================================================

if __name__ == "__main__":

    print("\n================================")
    print("MANUFACTURING AI")
    print("AUTOMATIC MONITORING MODE")
    print("================================")

    print(
        f"Analysis interval: "
        f"{MONITOR_INTERVAL_SECONDS} seconds"
    )

    print(
        f"Recent observations per machine: "
        f"{RECENT_OBSERVATIONS_PER_MACHINE}"
    )

    print(
        "\nPress Ctrl+C to stop monitoring.\n"
    )

    try:

        while True:

            run_monitor_cycle()

            print(
                f"\nNext AI analysis in "
                f"{MONITOR_INTERVAL_SECONDS} seconds..."
            )

            time.sleep(
                MONITOR_INTERVAL_SECONDS
            )

    except KeyboardInterrupt:

        print(
            "\nAutomatic AI monitoring stopped."
        )