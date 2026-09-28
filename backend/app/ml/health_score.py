from pathlib import Path
import json


# ============================================================
# PATHS
# ============================================================

# health_score.py is located at:
# backend/app/ml/health_score.py
#
# parents[2] points to:
# backend/
BASE_DIR = Path(__file__).resolve().parents[2] / "data" / "cira_pump"

PROFILE_FILE = BASE_DIR / "baseline_profiles.json"


# ============================================================
# CONFIGURATION
# ============================================================

# How strongly deviations outside the normal operating range
# reduce the sensor score.
#
# 30 points are removed for every full baseline-range distance.
#
# This is intentionally softer than the previous 100-point
# penalty so small operating variations do not immediately
# produce a very low health score.
DEVIATION_PENALTY = 30.0


# ============================================================
# LOAD BASELINE PROFILES
# ============================================================

def load_profiles():
    with open(
        PROFILE_FILE,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


# ============================================================
# SENSOR DEVIATION SCORE
# ============================================================

def deviation_score(
    value,
    p05,
    p95,
):
    """
    Convert deviation from the calibrated operating range
    into a 0-100 sensor health score.

    100:
        Value is inside the calibrated p05-p95 range.

    Below 100:
        Value is outside the calibrated range.

    The penalty is intentionally gradual so that a narrow
    baseline does not cause an immediate score collapse.

    This remains a prototype monitoring indicator and is not
    a certified industrial safety calculation.
    """

    # --------------------------------------------------------
    # Normal operating range
    # --------------------------------------------------------

    if p05 <= value <= p95:
        return 100.0

    # --------------------------------------------------------
    # Reference range
    # --------------------------------------------------------

    reference_span = max(
        p95 - p05,
        0.000001,
    )

    # --------------------------------------------------------
    # Distance outside the calibrated range
    # --------------------------------------------------------

    if value < p05:
        distance = p05 - value
    else:
        distance = value - p95

    # --------------------------------------------------------
    # Gradual deviation penalty
    # --------------------------------------------------------

    penalty = (
        distance / reference_span
    ) * DEVIATION_PENALTY

    score = 100.0 - penalty

    # --------------------------------------------------------
    # Keep score inside 0-100
    # --------------------------------------------------------

    return max(
        0.0,
        min(
            100.0,
            score,
        ),
    )


# ============================================================
# MACHINE HEALTH SCORE
# ============================================================

def calculate_health_score(
    pump,
    temperature,
    pressure,
    vibration,
):
    profiles = load_profiles()

    if pump not in profiles:
        raise ValueError(
            f"Unknown pump profile: {pump}"
        )

    profile = profiles[pump]

    temperature_profile = profile[
        "temperature_c"
    ]

    pressure_profile = profile[
        "pressure_bar"
    ]

    vibration_profile = profile[
        "vibration_mm_s"
    ]

    # --------------------------------------------------------
    # Temperature score
    # --------------------------------------------------------

    temperature_score = deviation_score(
        temperature,
        temperature_profile["p05"],
        temperature_profile["p95"],
    )

    # --------------------------------------------------------
    # Pressure score
    # --------------------------------------------------------

    pressure_score = deviation_score(
        pressure,
        pressure_profile["p05"],
        pressure_profile["p95"],
    )

    # --------------------------------------------------------
    # Vibration score
    # --------------------------------------------------------

    vibration_score = deviation_score(
        vibration,
        vibration_profile["p05"],
        vibration_profile["p95"],
    )

    # --------------------------------------------------------
    # Combine sensor scores
    # --------------------------------------------------------
    #
    # Equal contribution from:
    # Temperature
    # Pressure
    # Vibration
    #

    health_score = (
        temperature_score
        + pressure_score
        + vibration_score
    ) / 3

    # --------------------------------------------------------
    # Health status
    # --------------------------------------------------------

    if health_score >= 90:
        status = "Healthy"

    elif health_score >= 75:
        status = "Monitor"

    elif health_score >= 50:
        status = "Inspection Recommended"

    else:
        status = "High Deviation"

    # --------------------------------------------------------
    # Return result
    # --------------------------------------------------------

    return {
        "pump": pump,

        "health_score": round(
            health_score,
            2,
        ),

        "status": status,

        "sensor_scores": {
            "temperature": round(
                temperature_score,
                2,
            ),

            "pressure": round(
                pressure_score,
                2,
            ),

            "vibration": round(
                vibration_score,
                2,
            ),
        },
    }


# ============================================================
# TEST
# ============================================================

def main():

    print("=" * 60)
    print("MANUFACTURING AI")
    print("MACHINE HEALTH SCORE TEST")
    print("=" * 60)

    profiles = load_profiles()

    # --------------------------------------------------------
    # Test calibrated medians
    # --------------------------------------------------------

    print()
    print("TEST 1: CALIBRATED BASELINES")
    print("-" * 60)

    for pump, profile in profiles.items():

        temperature = profile[
            "temperature_c"
        ]["median"]

        pressure = profile[
            "pressure_bar"
        ]["median"]

        vibration = profile[
            "vibration_mm_s"
        ]["median"]

        result = calculate_health_score(
            pump,
            temperature,
            pressure,
            vibration,
        )

        print()
        print(f"Pump {pump}")
        print(
            f"Health Score: "
            f"{result['health_score']}"
        )
        print(
            f"Status: "
            f"{result['status']}"
        )

        print(
            "Temperature Score:",
            result["sensor_scores"]["temperature"],
        )

        print(
            "Pressure Score:",
            result["sensor_scores"]["pressure"],
        )

        print(
            "Vibration Score:",
            result["sensor_scores"]["vibration"],
        )

    # --------------------------------------------------------
    # Test moderate pressure deviation on B
    # --------------------------------------------------------

    if "B" in profiles:

        print()
        print("TEST 2: MODERATE PRESSURE DEVIATION")
        print("-" * 60)

        profile = profiles["B"]

        temperature = profile[
            "temperature_c"
        ]["median"]

        pressure = 43.50

        vibration = profile[
            "vibration_mm_s"
        ]["median"]

        result = calculate_health_score(
            "B",
            temperature,
            pressure,
            vibration,
        )

        print()
        print("Pump B")
        print(
            f"Temperature: {temperature}"
        )
        print(
            f"Pressure: {pressure}"
        )
        print(
            f"Vibration: {vibration}"
        )

        print(
            f"Health Score: "
            f"{result['health_score']}"
        )

        print(
            f"Status: "
            f"{result['status']}"
        )

        print(
            "Sensor Scores:",
            result["sensor_scores"],
        )

    # --------------------------------------------------------
    # Test strong vibration deviation on A
    # --------------------------------------------------------

    if "A" in profiles:

        print()
        print("TEST 3: STRONG VIBRATION DEVIATION")
        print("-" * 60)

        profile = profiles["A"]

        temperature = profile[
            "temperature_c"
        ]["median"]

        pressure = profile[
            "pressure_bar"
        ]["median"]

        vibration = 4.60

        result = calculate_health_score(
            "A",
            temperature,
            pressure,
            vibration,
        )

        print()
        print("Pump A")
        print(
            f"Temperature: {temperature}"
        )
        print(
            f"Pressure: {pressure}"
        )
        print(
            f"Vibration: {vibration}"
        )

        print(
            f"Health Score: "
            f"{result['health_score']}"
        )

        print(
            f"Status: "
            f"{result['status']}"
        )

        print(
            "Sensor Scores:",
            result["sensor_scores"],
        )

    print()
    print("=" * 60)
    print("HEALTH SCORE TEST COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()