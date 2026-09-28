from health_score import calculate_health_score


def print_result(title, result):
    print()
    print("=" * 60)
    print(title)
    print("=" * 60)

    print(f"Pump: {result['pump']}")
    print(f"Health Score: {result['health_score']}")
    print(f"Status: {result['status']}")

    print(
        "Temperature:",
        result["sensor_scores"]["temperature"],
    )

    print(
        "Pressure:",
        result["sensor_scores"]["pressure"],
    )

    print(
        "Vibration:",
        result["sensor_scores"]["vibration"],
    )


def main():

    # ---------------------------------------------------------
    # TEST 1: Normal baseline
    # ---------------------------------------------------------

    result = calculate_health_score(
        pump="A",
        temperature=24.457,
        pressure=41.9281,
        vibration=3.1931,
    )

    print_result(
        "TEST 1 - NORMAL",
        result,
    )

    # ---------------------------------------------------------
    # TEST 2: High vibration
    # ---------------------------------------------------------

    result = calculate_health_score(
        pump="A",
        temperature=24.457,
        pressure=41.9281,
        vibration=6.0,
    )

    print_result(
        "TEST 2 - HIGH VIBRATION",
        result,
    )

    # ---------------------------------------------------------
    # TEST 3: High pressure
    # ---------------------------------------------------------

    result = calculate_health_score(
        pump="A",
        temperature=24.457,
        pressure=50.0,
        vibration=3.1931,
    )

    print_result(
        "TEST 3 - HIGH PRESSURE",
        result,
    )

    # ---------------------------------------------------------
    # TEST 4: High temperature
    # ---------------------------------------------------------

    result = calculate_health_score(
        pump="A",
        temperature=35.0,
        pressure=41.9281,
        vibration=3.1931,
    )

    print_result(
        "TEST 4 - HIGH TEMPERATURE",
        result,
    )

    # ---------------------------------------------------------
    # TEST 5: All sensors abnormal
    # ---------------------------------------------------------

    result = calculate_health_score(
        pump="A",
        temperature=35.0,
        pressure=50.0,
        vibration=6.0,
    )

    print_result(
        "TEST 5 - ALL SENSORS ABNORMAL",
        result,
    )


if __name__ == "__main__":
    main()