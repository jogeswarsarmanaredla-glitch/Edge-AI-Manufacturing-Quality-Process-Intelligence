"""
Manufacturing AI - Live Sensor Simulator

Sends changing sensor readings to the FastAPI backend every 5 seconds.
Keep FastAPI running in another terminal.

Run:
    python sensor_simulator.py
"""

import json
import os
import random
import time
from datetime import datetime
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError


BACKEND_URL = os.getenv("BACKEND_URL", "http://127.0.0.1:8000").rstrip("/")
API_URL = f"{BACKEND_URL}/api/simulate-sensor"
INTERVAL_SECONDS = 5


# ============================================================
# MACHINE SENSOR BASELINES
# ============================================================

machines = {
    1: {
        "temperature": 24.85,
        "pressure": 42.59,
        "vibration": 3.08,

        "base_temperature": 24.85,
        "base_pressure": 42.59,
        "base_vibration": 3.08,
    },

    2: {
        "temperature": 19.04,
        "pressure": 43.15,
        "vibration": 2.61,

        "base_temperature": 19.04,
        "base_pressure": 43.15,
        "base_vibration": 2.61,
    },

    3: {
        "temperature": 19.43,
        "pressure": 43.29,
        "vibration": 2.73,

        "base_temperature": 19.43,
        "base_pressure": 43.29,
        "base_vibration": 2.73,
    },

    4: {
        "temperature": 21.37,
        "pressure": 42.78,
        "vibration": 2.79,

        "base_temperature": 21.37,
        "base_pressure": 42.78,
        "base_vibration": 2.79,
    },
}


# ============================================================
# HELPER
# ============================================================

def clamp(
    value: float,
    minimum: float,
    maximum: float
) -> float:

    return max(
        minimum,
        min(value, maximum)
    )


# ============================================================
# UPDATE SENSOR VALUES
# ============================================================

def update_machine(machine: dict) -> None:

    # --------------------------------------------------------
    # Temperature
    # --------------------------------------------------------
    # Move slightly toward the normal baseline
    # and add a small natural fluctuation.

    machine["temperature"] += (
        (
            machine["base_temperature"]
            - machine["temperature"]
        ) * 0.20
        + random.uniform(-0.22, 0.22)
    )

    # --------------------------------------------------------
    # Pressure
    # --------------------------------------------------------

    machine["pressure"] += (
        (
            machine["base_pressure"]
            - machine["pressure"]
        ) * 0.25
        + random.uniform(-0.08, 0.08)
    )

    # --------------------------------------------------------
    # Vibration
    # --------------------------------------------------------

    machine["vibration"] += (
        (
            machine["base_vibration"]
            - machine["vibration"]
        ) * 0.25
        + random.uniform(-0.035, 0.035)
    )

    # ========================================================
    # KEEP VALUES INSIDE NORMAL OPERATING RANGE
    # ========================================================

    machine["temperature"] = clamp(
        machine["temperature"],
        machine["base_temperature"] - 1.5,
        machine["base_temperature"] + 1.5,
    )

    machine["pressure"] = clamp(
        machine["pressure"],
        machine["base_pressure"] - 0.6,
        machine["base_pressure"] + 0.6,
    )

    machine["vibration"] = clamp(
        machine["vibration"],
        machine["base_vibration"] - 0.20,
        machine["base_vibration"] + 0.20,
    )


# ============================================================
# SEND SENSOR READING TO FASTAPI
# ============================================================

def send_reading(
    machine_id: int,
    machine: dict
) -> None:

    payload = {
        "machine_id": machine_id,

        "temperature": round(
            machine["temperature"],
            3
        ),

        "pressure": round(
            machine["pressure"],
            3
        ),

        "vibration": round(
            machine["vibration"],
            3
        ),

        "recorded_at": datetime.now().isoformat(),
    }

    request = Request(
        API_URL,
        data=json.dumps(
            payload
        ).encode("utf-8"),

        headers={
            "Content-Type":
            "application/json"
        },

        method="POST",
    )

    try:

        with urlopen(
            request,
            timeout=5
        ) as response:

            result = json.loads(
                response.read().decode(
                    "utf-8"
                )
            )

        if result.get("status") == "ok":

            print(
                f"Machine {machine_id} | "
                f"Temp {payload['temperature']:.2f} °C | "
                f"Pressure {payload['pressure']:.2f} bar | "
                f"Vibration {payload['vibration']:.2f} mm/s"
            )

        else:

            print(
                f"Machine {machine_id} | "
                f"Backend error: {result}"
            )

    except HTTPError as error:

        print(
            f"Machine {machine_id} | "
            f"HTTP error: {error.code}"
        )

    except URLError as error:

        print(
            f"Backend connection error: "
            f"{error.reason}"
        )

        raise

    except Exception as error:

        print(
            f"Machine {machine_id} | "
            f"Error: {error}"
        )


# ============================================================
# MAIN LOOP
# ============================================================

def main() -> None:

    print("=" * 70)

    print(
        "MANUFACTURING AI - LIVE SENSOR SIMULATOR"
    )

    print(
        f"Sending new readings every "
        f"{INTERVAL_SECONDS} seconds"
    )

    print(
        "Sensor values will fluctuate around "
        "their normal operating baseline."
    )

    print(
        "Press Ctrl+C to stop."
    )

    print("=" * 70)

    while True:

        for machine_id, machine in machines.items():

            update_machine(
                machine
            )

            send_reading(
                machine_id,
                machine
            )

        print("-" * 70)

        time.sleep(
            INTERVAL_SECONDS
        )


# ============================================================
# START
# ============================================================

if __name__ == "__main__":

    try:

        main()

    except KeyboardInterrupt:

        print(
            "\nSensor simulator stopped."
        )

