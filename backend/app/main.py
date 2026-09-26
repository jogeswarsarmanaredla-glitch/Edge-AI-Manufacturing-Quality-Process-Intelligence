from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.database import engine


app = FastAPI(title="Manufacturing AI API")


origins = [
    "http://localhost:5173",
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "Manufacturing AI backend is running",
    }


@app.get("/api/machines")
def get_machines():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    name,
                    status,
                    score
                FROM machines
                ORDER BY id
            """)
        )

        machines = []

        for row in result.mappings():
            machines.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "status": row["status"],
                    "score": float(row["score"]),
                }
            )

        return machines


@app.get("/api/sensors")
def get_sensors():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    machine_id,
                    sensor_type,
                    value,
                    unit,
                    recorded_at
                FROM sensors
                ORDER BY recorded_at DESC, id DESC
            """)
        )

        sensors = []

        for row in result.mappings():
            sensors.append(
                {
                    "id": row["id"],
                    "machine_id": row["machine_id"],
                    "sensor_type": row["sensor_type"],
                    "value": float(row["value"]),
                    "unit": row["unit"],
                    "recorded_at": (
                        row["recorded_at"].isoformat()
                        if row["recorded_at"] is not None
                        else None
                    ),
                }
            )

        return sensors


@app.get("/api/alerts")
def get_alerts():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    machine_id,
                    sensor_type,
                    alert_type,
                    severity,
                    message,
                    value,
                    unit,
                    created_at,
                    resolved
                FROM alerts
                ORDER BY created_at DESC, id DESC
            """)
        )

        alerts = []

        for row in result.mappings():
            alerts.append(
                {
                    "id": row["id"],
                    "machine_id": row["machine_id"],
                    "sensor_type": row["sensor_type"],
                    "alert_type": row["alert_type"],
                    "severity": row["severity"],
                    "message": row["message"],
                    "value": (
                        float(row["value"])
                        if row["value"] is not None
                        else None
                    ),
                    "unit": row["unit"],
                    "created_at": (
                        row["created_at"].isoformat()
                        if row["created_at"] is not None
                        else None
                    ),
                    "resolved": bool(row["resolved"]),
                }
            )

        return alerts


@app.get("/api/analytics")
def get_analytics():
    with engine.connect() as connection:

        # Overall sensor statistics
        sensor_stats = connection.execute(
            text("""
                SELECT
                    COUNT(*) AS total_readings,

                    AVG(value) FILTER (
                        WHERE sensor_type = 'Temperature'
                    ) AS avg_temperature,

                    AVG(value) FILTER (
                        WHERE sensor_type = 'Vibration'
                    ) AS avg_vibration,

                    AVG(value) FILTER (
                        WHERE sensor_type = 'Pressure'
                    ) AS avg_pressure

                FROM sensors
            """)
        ).mappings().one()

        # Alert statistics
        alert_stats = connection.execute(
            text("""
                SELECT
                    COUNT(*) AS total_alerts,

                    COUNT(*) FILTER (
                        WHERE severity = 'Critical'
                    ) AS critical_alerts,

                    COUNT(*) FILTER (
                        WHERE severity = 'Warning'
                    ) AS warning_alerts,

                    COUNT(*) FILTER (
                        WHERE resolved = FALSE
                    ) AS unresolved_alerts

                FROM alerts
            """)
        ).mappings().one()

        # Latest sensor reading for every machine/sensor combination
        machine_rows = connection.execute(
            text("""
                WITH latest_sensor AS (
                    SELECT DISTINCT ON (machine_id, sensor_type)
                        machine_id,
                        sensor_type,
                        value,
                        recorded_at
                    FROM sensors
                    ORDER BY
                        machine_id,
                        sensor_type,
                        recorded_at DESC,
                        id DESC
                ),

                alert_counts AS (
                    SELECT
                        machine_id,
                        COUNT(*) AS alert_count
                    FROM alerts
                    GROUP BY machine_id
                )

                SELECT
                    m.id,
                    m.name,
                    m.status,
                    m.score,

                    MAX(
                        CASE
                            WHEN ls.sensor_type = 'Temperature'
                            THEN ls.value
                        END
                    ) AS temperature,

                    MAX(
                        CASE
                            WHEN ls.sensor_type = 'Vibration'
                            THEN ls.value
                        END
                    ) AS vibration,

                    MAX(
                        CASE
                            WHEN ls.sensor_type = 'Pressure'
                            THEN ls.value
                        END
                    ) AS pressure,

                    COALESCE(
                        ac.alert_count,
                        0
                    ) AS alert_count

                FROM machines m

                LEFT JOIN latest_sensor ls
                    ON ls.machine_id = m.id

                LEFT JOIN alert_counts ac
                    ON ac.machine_id = m.id

                GROUP BY
                    m.id,
                    m.name,
                    m.status,
                    m.score,
                    ac.alert_count

                ORDER BY m.id
            """)
        ).mappings().all()

        machines = []

        for row in machine_rows:
            machines.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "status": row["status"],
                    "score": float(row["score"]),

                    "temperature": (
                        float(row["temperature"])
                        if row["temperature"] is not None
                        else None
                    ),

                    "vibration": (
                        float(row["vibration"])
                        if row["vibration"] is not None
                        else None
                    ),

                    "pressure": (
                        float(row["pressure"])
                        if row["pressure"] is not None
                        else None
                    ),

                    "alert_count": int(row["alert_count"]),
                }
            )

        return {
            "summary": {
                "total_readings": int(
                    sensor_stats["total_readings"]
                ),

                "average_temperature": (
                    round(
                        float(sensor_stats["avg_temperature"]),
                        2,
                    )
                    if sensor_stats["avg_temperature"] is not None
                    else None
                ),

                "average_vibration": (
                    round(
                        float(sensor_stats["avg_vibration"]),
                        2,
                    )
                    if sensor_stats["avg_vibration"] is not None
                    else None
                ),

                "average_pressure": (
                    round(
                        float(sensor_stats["avg_pressure"]),
                        2,
                    )
                    if sensor_stats["avg_pressure"] is not None
                    else None
                ),
            },

            "alerts": {
                "total": int(alert_stats["total_alerts"]),
                "critical": int(alert_stats["critical_alerts"]),
                "warning": int(alert_stats["warning_alerts"]),
                "unresolved": int(alert_stats["unresolved_alerts"]),
            },

            "machines": machines,
        }