import random
import time
from datetime import datetime

import requests


FASTAPI_URL = "http://172.19.32.1:8000"


MACHINES = {
    1: {
        "temperature": 72.0,
        "vibration": 3.2,
        "pressure": 6.5,
    },
    2: {
        "temperature": 76.0,
        "vibration": 4.1,
        "pressure": 6.8,
    },
    3: {
        "temperature": 68.0,
        "vibration": 2.0,
        "pressure": 6.3,
    },
    4: {
        "temperature": 82.0,
        "vibration": 5.5,
        "pressure": 7.1,
    },
}


def generate_reading(machine_id: int):
    base = MACHINES[machine_id]

    # Mostly normal readings
    temperature = base["temperature"] + random.uniform(-2.0, 2.0)
    vibration = base["vibration"] + random.uniform(-0.4, 0.4)
    pressure = base["pressure"] + random.uniform(-0.2, 0.2)

    # Occasionally create an abnormal machine condition
    abnormal = random.random() < 0.10

    if abnormal:
        temperature += random.uniform(10.0, 15.0)
        vibration += random.uniform(3.0, 5.0)
        pressure += random.uniform(0.8, 1.5)

    return {
        "machine_id": machine_id,
        "temperature": round(temperature, 2),
        "vibration": round(vibration, 2),
        "pressure": round(pressure, 2),
        "abnormal": abnormal,
        "recorded_at": datetime.now().isoformat(),
    }


def send_reading(machine_id: int):
    reading = generate_reading(machine_id)

    payload = {
        "machine_id": reading["machine_id"],
        "temperature": reading["temperature"],
        "vibration": reading["vibration"],
        "pressure": reading["pressure"],
        "recorded_at": reading["recorded_at"],
    }

    response = requests.post(
        f"{FASTAPI_URL}/api/simulate-sensor",
        json=payload,
        timeout=10,
    )

    response.raise_for_status()

    print(
        f"Machine {machine_id} | "
        f"T={reading['temperature']} °C | "
        f"V={reading['vibration']} mm/s | "
        f"P={reading['pressure']} bar"
    )


if __name__ == "__main__":
    print("Starting Manufacturing AI sensor simulator...")

    while True:
        for machine_id in MACHINES:
            try:
                send_reading(machine_id)
            except requests.RequestException as error:
                print(
                    f"Machine {machine_id} request failed: {error}"
                )

        time.sleep(5)