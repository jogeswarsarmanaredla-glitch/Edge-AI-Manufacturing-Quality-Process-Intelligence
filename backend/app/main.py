from datetime import datetime, timedelta
from pathlib import Path
import json
import subprocess

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import text

from app.database import engine


app = FastAPI(title="Manufacturing AI API")

# Inspection image storage
BASE_DIR = Path(__file__).resolve().parent.parent
INSPECTION_UPLOAD_DIR = BASE_DIR / "uploads" / "inspections"
INSPECTION_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Prevent repeated AI alerts for the same machine
# inside this cooldown window.
AI_ALERT_COOLDOWN_SECONDS = 60


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


# ============================================================
# AI ALERT DATA MODEL
# ============================================================

class AIAlert(BaseModel):
    machine_id: int
    sensor_type: str
    alert_type: str
    severity: str
    message: str
    value: float | None = None
    unit: str | None = None
    created_at: datetime
    resolved: bool = False


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "message": "Manufacturing AI backend is running",
    }


# ============================================================
# INSPECTION IMAGE UPLOAD
# ============================================================

@app.post("/api/inspections/upload")
async def upload_inspection_image(
    file: UploadFile = File(...),
):
    allowed_content_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if file.content_type not in allowed_content_types:
        return {
            "status": "error",
            "message": "Only JPG, PNG, and WEBP images are supported.",
        }

    file_extension = Path(file.filename or "").suffix.lower()

    if file_extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        return {
            "status": "error",
            "message": "Unsupported image file extension.",
        }

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    safe_filename = f"inspection_{timestamp}{file_extension}"
    file_path = INSPECTION_UPLOAD_DIR / safe_filename

    contents = await file.read()
    file_path.write_bytes(contents)

    return {
        "status": "ok",
        "message": "Inspection image uploaded successfully.",
        "filename": safe_filename,
        "path": str(file_path),
    }


# ============================================================
# INSPECTION RECORDS
# ============================================================

@app.get("/api/inspections")
def get_inspections():
    with engine.connect() as connection:
        result = connection.execute(
            text("""
                SELECT
                    id,
                    machine_id,
                    image_path,
                    result,
                    confidence,
                    defect_count,
                    defect_details,
                    created_at
                FROM inspections
                ORDER BY created_at DESC, id DESC
                LIMIT 50
            """)
        ).mappings().all()

    inspections = []

    for row in result:
        inspections.append(
            {
                "id": row["id"],
                "machine_id": row["machine_id"],
                "image_path": row["image_path"],
                "result": row["result"],
                "confidence": (
                    float(row["confidence"])
                    if row["confidence"] is not None
                    else None
                ),
                "defect_count": int(row["defect_count"] or 0),
                "defect_details": row["defect_details"],
                "created_at": (
                    row["created_at"].isoformat()
                    if row["created_at"] is not None
                    else None
                ),
            }
        )

    return inspections


@app.post("/api/inspections/create")
async def create_inspection(
    machine_id: int,
    file: UploadFile = File(...),
):
    allowed_content_types = {
        "image/jpeg",
        "image/png",
        "image/webp",
    }

    if file.content_type not in allowed_content_types:
        return {
            "status": "error",
            "message": "Only JPG, PNG, and WEBP images are supported.",
        }

    file_extension = Path(file.filename or "").suffix.lower()

    if file_extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        return {
            "status": "error",
            "message": "Unsupported image file extension.",
        }

    with engine.begin() as connection:
        machine_exists = connection.execute(
            text("""
                SELECT 1
                FROM machines
                WHERE id = :machine_id
                LIMIT 1
            """),
            {"machine_id": machine_id},
        ).first()

        if not machine_exists:
            return {
                "status": "error",
                "message": f"Machine {machine_id} does not exist.",
            }

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        safe_filename = f"inspection_{timestamp}{file_extension}"
        file_path = INSPECTION_UPLOAD_DIR / safe_filename

        contents = await file.read()
        file_path.write_bytes(contents)

        inspection_result = connection.execute(
            text("""
                INSERT INTO inspections (
                    machine_id,
                    image_path,
                    result,
                    confidence,
                    defect_count,
                    defect_details
                )
                VALUES (
                    :machine_id,
                    :image_path,
                    'Pending',
                    NULL,
                    0,
                    :defect_details
                )
                RETURNING
                    id,
                    created_at
            """),
            {
                "machine_id": machine_id,
                "image_path": str(file_path),
                "defect_details": "Awaiting computer vision analysis.",
            },
        ).mappings().one()

    return {
        "status": "ok",
        "message": "Inspection created successfully.",
        "inspection_id": inspection_result["id"],
        "machine_id": machine_id,
        "filename": safe_filename,
        "path": str(file_path),
        "result": "Pending",
        "created_at": (
            inspection_result["created_at"].isoformat()
            if inspection_result["created_at"] is not None
            else None
        ),
    }


# ============================================================
# MACHINES
# ============================================================

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


# ============================================================
# SENSORS
# ============================================================

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


# ============================================================
# ALERTS
# ============================================================

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


# ============================================================
# ANALYTICS
# ============================================================

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


# ============================================================
# LIVE MACHINE HEALTH SCORES
# ============================================================

@app.get("/api/health-scores")
def get_health_scores():
    """
    Calculate live machine health scores from the current
    PostgreSQL sensor stream using the CIRA-based health service.
    """

    command = (
        "source /home/jogesh-3339/.mlvenv/bin/activate && "
        "cd /mnt/c/ManufacturingAI/backend && "
        "python app/ml/health_api.py"
    )

    try:
        result = subprocess.run(
            [
                "wsl",
                "bash",
                "-lc",
                command,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            return {
                "status": "error",
                "message": "Health score calculation failed",
                "error": result.stderr.strip(),
                "machines": [],
            }

        output = result.stdout.strip()

        if not output:
            return {
                "status": "error",
                "message": "Health score service returned no data",
                "machines": [],
            }

        health_data = json.loads(output)

        return health_data

    except subprocess.TimeoutExpired:
        return {
            "status": "error",
            "message": "Health score calculation timed out",
            "machines": [],
        }

    except json.JSONDecodeError as error:
        return {
            "status": "error",
            "message": "Invalid JSON returned by health score service",
            "error": str(error),
            "machines": [],
        }

    except Exception as error:
        return {
            "status": "error",
            "message": "Failed to calculate health scores",
            "error": str(error),
            "machines": [],
        }


# ============================================================
# COMBINED MACHINE AI INSIGHTS
# ============================================================

@app.get("/api/machine-insights")
def get_machine_insights():
    """
    Calculate a unified machine insight using:
    - CIRA-based health scoring
    - Machine-specific Isolation Forest anomaly detection

    The combined_monitor.py script prints diagnostic text
    followed by a final JSON object. This endpoint extracts
    that final JSON result and returns it to the frontend.
    """

    command = (
        "source /home/jogesh-3339/.mlvenv/bin/activate && "
        "cd /mnt/c/ManufacturingAI/backend && "
        "python app/ml/combined_monitor.py"
    )

    try:
        result = subprocess.run(
            [
                "wsl",
                "bash",
                "-lc",
                command,
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            return {
                "status": "error",
                "message": "Combined AI analysis failed",
                "error": result.stderr.strip(),
                "machines": [],
            }

        output = result.stdout.strip()

        if not output:
            return {
                "status": "error",
                "message": "Combined AI service returned no data",
                "machines": [],
            }

        # combined_monitor.py prints diagnostic text before
        # its final JSON response. Find that final JSON block.
        json_marker = '\n{\n  "status":'

        json_start = output.rfind(json_marker)

        if json_start == -1:
            json_start = output.find('{\n  "status":')

        if json_start == -1:
            return {
                "status": "error",
                "message": (
                    "No JSON result returned by combined AI service"
                ),
                "raw_output": output,
                "machines": [],
            }

        json_output = output[json_start:].strip()

        try:
            machine_data = json.loads(json_output)

        except json.JSONDecodeError as error:
            return {
                "status": "error",
                "message": (
                    "Invalid JSON returned by combined AI service"
                ),
                "error": str(error),
                "raw_output": output,
                "machines": [],
            }

        return machine_data

    except subprocess.TimeoutExpired:
        return {
            "status": "error",
            "message": "Combined AI analysis timed out",
            "machines": [],
        }

    except Exception as error:
        return {
            "status": "error",
            "message": "Failed to calculate machine insights",
            "error": str(error),
            "machines": [],
        }


# ============================================================
# AI ALERT INSERTION
# ============================================================

@app.post("/api/ai-alerts")
def create_ai_alerts(alerts: list[AIAlert]):
    inserted = 0
    skipped = 0

    with engine.begin() as connection:

        for alert in alerts:

            # ------------------------------------------------
            # 1. Exact duplicate protection
            # ------------------------------------------------

            existing_exact = connection.execute(
                text("""
                    SELECT 1
                    FROM alerts
                    WHERE machine_id = :machine_id
                      AND alert_type = :alert_type
                      AND created_at = :created_at
                    LIMIT 1
                """),
                {
                    "machine_id": alert.machine_id,
                    "alert_type": alert.alert_type,
                    "created_at": alert.created_at,
                },
            ).first()

            if existing_exact:
                skipped += 1
                continue

            # ------------------------------------------------
            # 2. AI cooldown protection
            #
            # If this machine already received an AI alert
            # during the previous 60 seconds, do not create
            # another one.
            # ------------------------------------------------

            cooldown_start = (
                alert.created_at
                - timedelta(
                    seconds=AI_ALERT_COOLDOWN_SECONDS
                )
            )

            recent_ai_alert = connection.execute(
                text("""
                    SELECT 1
                    FROM alerts
                    WHERE machine_id = :machine_id
                      AND alert_type = 'AI Anomaly'
                      AND created_at >= :cooldown_start
                      AND created_at < :created_at
                    ORDER BY created_at DESC
                    LIMIT 1
                """),
                {
                    "machine_id": alert.machine_id,
                    "cooldown_start": cooldown_start,
                    "created_at": alert.created_at,
                },
            ).first()

            if recent_ai_alert:
                skipped += 1
                continue

            # ------------------------------------------------
            # 3. Insert new AI alert
            # ------------------------------------------------

            connection.execute(
                text("""
                    INSERT INTO alerts (
                        machine_id,
                        sensor_type,
                        alert_type,
                        severity,
                        message,
                        value,
                        unit,
                        created_at,
                        resolved
                    )
                    VALUES (
                        :machine_id,
                        :sensor_type,
                        :alert_type,
                        :severity,
                        :message,
                        :value,
                        :unit,
                        :created_at,
                        :resolved
                    )
                """),
                {
                    "machine_id": alert.machine_id,
                    "sensor_type": alert.sensor_type,
                    "alert_type": alert.alert_type,
                    "severity": alert.severity,
                    "message": alert.message,
                    "value": alert.value,
                    "unit": alert.unit,
                    "created_at": alert.created_at,
                    "resolved": alert.resolved,
                },
            )

            inserted += 1

    return {
        "status": "ok",
        "inserted": inserted,
        "skipped": skipped,
        "cooldown_seconds": AI_ALERT_COOLDOWN_SECONDS,
    }


# ============================================================
# RUN AI ANALYSIS
# ============================================================

@app.post("/api/ai/analyze")
def run_ai_analysis():
    command = (
        "source /home/jogesh-3339/.mlvenv/bin/activate && "
        "cd /mnt/c/ManufacturingAI/backend && "
        "python app/ml/anomaly.py"
    )

    try:
        result = subprocess.run(
            [
                "wsl",
                "bash",
                "-lc",
                command,
            ],
            capture_output=True,
            text=True,
            timeout=120,
        )

        # AI process failed
        if result.returncode != 0:
            return {
                "status": "error",
                "message": "AI analysis failed",
                "output": result.stdout,
                "error": result.stderr,
                "anomalies_detected": 0,
                "anomalies": [],
            }

        # ----------------------------------------------------
        # Read AI anomaly alerts from PostgreSQL
        # ----------------------------------------------------

        with engine.connect() as connection:
            ai_results = connection.execute(
                text("""
                    SELECT
                        id,
                        machine_id,
                        sensor_type,
                        severity,
                        message,
                        value,
                        unit,
                        created_at
                    FROM alerts
                    WHERE alert_type = 'AI Anomaly'
                    ORDER BY created_at DESC, id DESC
                    LIMIT 10
                """)
            ).mappings().all()

        anomalies = []

        for row in ai_results:
            anomalies.append(
                {
                    "id": row["id"],
                    "machine_id": row["machine_id"],
                    "sensor_type": row["sensor_type"],
                    "severity": row["severity"],
                    "message": row["message"],
                    "anomaly_score": (
                        float(row["value"])
                        if row["value"] is not None
                        else None
                    ),
                    "created_at": (
                        row["created_at"].isoformat()
                        if row["created_at"] is not None
                        else None
                    ),
                }
            )

        return {
            "status": "ok",
            "message": "AI analysis completed successfully",
            "output": result.stdout,
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies,
        }

    except subprocess.TimeoutExpired:
        return {
            "status": "error",
            "message": "AI analysis timed out",
            "anomalies_detected": 0,
            "anomalies": [],
        }

    except Exception as error:
        return {
            "status": "error",
            "message": "Failed to start AI analysis",
            "error": str(error),
            "anomalies_detected": 0,
            "anomalies": [],
        }


# ============================================================
# SENSOR SIMULATION
# ============================================================

class SimulatedSensorReading(BaseModel):
    machine_id: int
    temperature: float
    vibration: float
    pressure: float
    recorded_at: datetime


@app.post("/api/simulate-sensor")
def simulate_sensor(
    reading: SimulatedSensorReading
):

    with engine.begin() as connection:

        # ------------------------------------------------
        # Check that the machine exists
        # ------------------------------------------------

        machine_exists = connection.execute(
            text("""
                SELECT 1
                FROM machines
                WHERE id = :machine_id
                LIMIT 1
            """),
            {
                "machine_id": reading.machine_id,
            },
        ).first()

        if not machine_exists:
            return {
                "status": "error",
                "message": (
                    f"Machine {reading.machine_id} "
                    "does not exist."
                ),
            }

        # ------------------------------------------------
        # Temperature
        # ------------------------------------------------

        connection.execute(
            text("""
                INSERT INTO sensors (
                    machine_id,
                    sensor_type,
                    value,
                    unit,
                    recorded_at
                )
                VALUES (
                    :machine_id,
                    'Temperature',
                    :value,
                    '°C',
                    :recorded_at
                )
            """),
            {
                "machine_id": reading.machine_id,
                "value": reading.temperature,
                "recorded_at": reading.recorded_at,
            },
        )

        # ------------------------------------------------
        # Vibration
        # ------------------------------------------------

        connection.execute(
            text("""
                INSERT INTO sensors (
                    machine_id,
                    sensor_type,
                    value,
                    unit,
                    recorded_at
                )
                VALUES (
                    :machine_id,
                    'Vibration',
                    :value,
                    'mm/s',
                    :recorded_at
                )
            """),
            {
                "machine_id": reading.machine_id,
                "value": reading.vibration,
                "recorded_at": reading.recorded_at,
            },
        )

        # ------------------------------------------------
        # Pressure
        # ------------------------------------------------

        connection.execute(
            text("""
                INSERT INTO sensors (
                    machine_id,
                    sensor_type,
                    value,
                    unit,
                    recorded_at
                )
                VALUES (
                    :machine_id,
                    'Pressure',
                    :value,
                    'bar',
                    :recorded_at
                )
            """),
            {
                "machine_id": reading.machine_id,
                "value": reading.pressure,
                "recorded_at": reading.recorded_at,
            },
        )

    return {
        "status": "ok",
        "message": "Sensor reading stored successfully",
        "machine_id": reading.machine_id,
        "temperature": reading.temperature,
        "vibration": reading.vibration,
        "pressure": reading.pressure,
        "recorded_at": reading.recorded_at.isoformat(),
    }