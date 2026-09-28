# AI-Based Manufacturing Condition & Visual Quality Intelligence System

## Project Overview

An AI-driven manufacturing intelligence platform that combines machine-condition monitoring, anomaly detection, and automated visual quality inspection.

The system continuously analyzes machine sensor conditions and uses computer vision to identify surface defects in manufactured products.

## Core AI Modules

### 1. Machine Condition Intelligence
Machine sensor inputs:
- Temperature
- Pressure
- Vibration

The system combines calibrated CIRA-based health scoring with Isolation Forest anomaly detection to determine the current machine condition.

Possible conditions:
- Healthy
- Monitor
- Inspection Recommended
- High Deviation

### 2. Visual Quality Inspection

A custom YOLO11n model trained on the NEU-DET surface-defect dataset detects:

- Crazing
- Inclusion
- Patches
- Pitted surface
- Rolled-in scale
- Scratches

The application produces:
- Defect class
- Confidence
- Bounding boxes
- Defect count
- Annotated inspection image

### 3. Machine + Product Intelligence

Each inspection can store the machine condition snapshot at the inspection time:

- Machine health score
- Temperature
- Pressure
- Vibration
- Anomaly status
- Visual inspection result

This connects product-quality information with machine-condition information.

## Application Architecture

React + TypeScript
        |
        v
FastAPI Backend
        |
        +---- PostgreSQL
        |
        +---- Machine Sensor AI
        |       |
        |       +---- CIRA Health Score
        |       +---- Isolation Forest
        |
        +---- YOLO11n Visual Inspection
                |
                +---- ONNX
                |
                +---- Qualcomm AI Hub
                        |
                        +---- Snapdragon X Elite CRD
                        |
                        +---- ONNX Runtime + QNN

## Snapdragon AI Deployment

The trained YOLO11n model was exported to ONNX and validated.

The ONNX graph was cleaned to remove duplicate model I/O value_info entries.

The cleaned model was successfully compiled through Qualcomm AI Hub for:

- Device: Snapdragon X Elite CRD
- OS: Windows 11
- Target model: mn752o53m
- Compile job: jp2rqdw4g

The compiled model was successfully profiled:

- Profile job: jp3zl79l5
- Runtime path: ONNX Runtime + QNN
- Profile status: SUCCESS

### Snapdragon Profile Results

- Minimum inference time: 0.740 ms
- Median inference time: 0.747 ms
- Reported inference peak memory: 34.45 MB
- First load time: 2.655 s
- Warm load time: 0.616 s

### Deployment Note

The Snapdragon profiling results were obtained on Qualcomm AI Hub's hosted Snapdragon X Elite CRD.

The development laptop used during implementation is AMD Ryzen-based and was not used as a Snapdragon NPU device.

## Technology Stack

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS

Backend:
- Python
- FastAPI
- Uvicorn

Database:
- PostgreSQL

AI / ML:
- YOLO11n
- PyTorch
- Ultralytics
- OpenCV
- Isolation Forest
- CIRA-based health scoring
- ONNX

Edge AI:
- Qualcomm AI Hub
- ONNX Runtime
- QNN
- Snapdragon X Elite CRD

## Intended Industrial Workflow

1. Machine sensors continuously provide condition data.
2. AI analyzes machine health and detects abnormal behavior.
3. A production camera captures product images.
4. YOLO11n analyzes the product surface.
5. Defects are classified and localized.
6. The inspection is stored together with the machine-condition snapshot.
7. Operators can monitor machine health, alerts, inspections, and analytics from the dashboard.

## Current Prototype Scope

The current prototype uses manual image upload to demonstrate the visual inspection pipeline.

In an industrial deployment, the image-upload step can be replaced by an automatically triggered production camera.

## Important Technical Qualification

The machine health score is a prototype monitoring indicator and is not a certified industrial safety measurement.

The Snapdragon performance figures represent Qualcomm AI Hub hosted-device profiling and should not be interpreted as measurements from the AMD development laptop.
