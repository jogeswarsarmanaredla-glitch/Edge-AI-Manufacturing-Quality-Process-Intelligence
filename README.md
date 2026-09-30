# AI-Based Manufacturing Condition & Visual Quality Intelligence System

An AI-powered manufacturing platform that combines machine-condition intelligence with automated visual quality inspection.

## 🚀 Live Demo

**Live Manufacturing AI Dashboard:**  
https://edge-ai-manufacturing-quality-process-c5yb.onrender.com

> The live demo connects the deployed React frontend to the project's FastAPI backend for the current prototype demonstration.

## What the system does

The platform provides two connected AI capabilities:

1. **Machine Condition Intelligence**
   - Temperature
   - Pressure
   - Vibration
   - CIRA-based health scoring
   - Isolation Forest anomaly detection

2. **Visual Quality Inspection**
   - Custom YOLO11n model
   - NEU-DET surface-defect dataset
   - Defect classification
   - Bounding-box localization
   - Confidence scoring
   - Annotated inspection images

The system also stores the machine-condition snapshot at the time of each visual inspection, connecting machine health with product quality.

## Defects detected

The trained YOLO11n model supports:

- Crazing
- Inclusion
- Patches
- Pitted surface
- Rolled-in scale
- Scratches

## Architecture

React + TypeScript
        |
        v
FastAPI
        |
        +---------------- PostgreSQL
        |
        +---------------- Machine AI
        |                  |
        |                  +-- CIRA Health Score
        |                  +-- Isolation Forest
        |
        +---------------- Visual AI
                           |
                           +-- YOLO11n
                           |
                           +-- ONNX
                           |
                           +-- Qualcomm AI Hub
                                  |
                                  +-- Snapdragon X Elite CRD
                                  +-- ONNX Runtime + QNN

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Python
- FastAPI
- Uvicorn

### Database
- PostgreSQL

### AI / ML
- PyTorch
- Ultralytics YOLO11n
- OpenCV
- Isolation Forest
- CIRA-based health scoring
- ONNX

### Edge AI
- Qualcomm AI Hub
- ONNX Runtime
- QNN
- Snapdragon X Elite CRD

## Machine Intelligence

Sensor readings are analyzed using calibrated machine-specific profiles and anomaly detection.

The system classifies machine condition as:

- Healthy
- Monitor
- Inspection Recommended
- High Deviation

The health score is a prototype monitoring indicator and is not a certified industrial safety measurement.

## Visual Inspection Pipeline

Production image
      |
      v
YOLO11n
      |
      +-- defect class
      +-- confidence
      +-- bounding box
      +-- defect count
      |
      v
Inspection record
      |
      +-- machine health snapshot
      +-- temperature
      +-- pressure
      +-- vibration
      +-- anomaly status

The current prototype uses manual image upload to demonstrate the inspection pipeline. In an industrial deployment, this step can be replaced by an automatically triggered production camera.

## Qualcomm Snapdragon Deployment

The trained YOLO11n model was exported to ONNX and validated.

The ONNX graph was cleaned to remove a duplicate model I/O/value_info entry.

The cleaned model was successfully compiled and profiled through Qualcomm AI Hub.

### Verified deployment

- Device: Snapdragon X Elite CRD
- OS: Windows 11
- Compile Job: jp2rqdw4g
- Target Model: mn752o53m
- Profile Job: jp3zl79l5
- Runtime path: ONNX Runtime + QNN
- Profile status: SUCCESS

### Profile results

- Minimum inference time: **0.740 ms**
- Median inference time: **0.747 ms**
- Reported inference peak memory: **34.45 MB**
- First load time: **2.655 s**
- Warm load time: **0.616 s**

These measurements were obtained on Qualcomm AI Hub's hosted Snapdragon X Elite CRD.

The development laptop used during implementation is AMD Ryzen-based and was not used as a Snapdragon NPU device.

## Application Modules

### Dashboard
Provides:
- Overall machine health
- Machine status
- Defects today
- Active alerts
- Live machine conditions
- AI insights

### Machines
Provides:
- Machine health score
- AI condition
- Current sensor condition
- AI explanation
- Recommended action

### Inspections
Provides:
- Product inspection history
- Defect classification
- Confidence
- Detection count
- Annotated image
- Machine-condition snapshot

### Reports
Provides:
- Average machine health
- Sensor statistics
- Defect statistics
- Alert statistics
- Machine-level information
- Recent AI inspections

### Settings
Provides:
- Backend connection status
- Database configuration information
- AI configuration
- Sensor monitoring configuration
- Deployment information

## Project Workflow

1. Machine sensors generate readings.
2. AI evaluates machine condition.
3. A production image is captured or uploaded.
4. YOLO11n analyzes the product surface.
5. Defects are detected and localized.
6. The inspection is stored with the machine snapshot.
7. Operators monitor the system from the web dashboard.
8. The visual model can be optimized for Snapdragon Edge deployment.

## Development Environment

- Windows
- React / TypeScript
- Python / FastAPI
- PostgreSQL
- WSL ML environment
- Ultralytics YOLO11n
- Qualcomm AI Hub

## Project Status

### Completed

- [x] React manufacturing dashboard
- [x] FastAPI backend
- [x] PostgreSQL integration
- [x] Live sensor simulation
- [x] CIRA-based machine health scoring
- [x] Isolation Forest anomaly detection
- [x] YOLO11n surface-defect model
- [x] NEU-DET dataset integration
- [x] Bounding-box visual inspection
- [x] Inspection history
- [x] Machine-condition snapshots
- [x] Reports
- [x] Settings
- [x] ONNX export
- [x] ONNX graph validation and cleanup
- [x] Qualcomm AI Hub compilation
- [x] Snapdragon X Elite profiling
- [x] QNN execution path verification

## Important Technical Qualification

The machine health score is a prototype monitoring indicator and is not a certified industrial safety measurement.

The Snapdragon performance results represent Qualcomm AI Hub hosted-device profiling and should not be interpreted as measurements from the AMD development laptop.

## Author

Manufacturing AI project developed for the Snapdragon AI Lab Build & Present Challenge.
