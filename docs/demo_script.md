# Final Demo Script — 2 Minute Version

## 0:00–0:10 — Problem

Show the Dashboard.

Say:

"Manufacturing teams need to detect machine abnormalities early while also identifying defects in the products being produced. This project combines both capabilities into one AI-driven manufacturing intelligence platform."

## 0:10–0:30 — Machine Condition AI

Show the Dashboard and Machines page.

Say:

"The first AI layer monitors temperature, pressure, and vibration. A calibrated health score is combined with Isolation Forest anomaly detection to identify abnormal machine behavior."

Point to:
- Machine health score
- Machine condition
- AI explanation
- Recommended action

## 0:30–0:55 — Visual Quality Inspection

Open the Inspections page.

Upload the prepared patches image.

Say:

"The second AI layer performs visual quality inspection using a custom YOLO11n model trained on the NEU-DET surface-defect dataset."

Point to:
- Defect class
- Confidence
- Bounding box
- Defect count
- Annotated image

Say:

"In a real factory, this manual upload can be replaced by an automatically triggered production camera."

## 0:55–1:15 — Machine + Product Intelligence

Show the inspection history.

Say:

"Each inspection is linked with the machine condition at the same time. This lets the system connect product quality with machine health instead of treating them as separate problems."

Point to:
- Machine health score
- Temperature
- Pressure
- Vibration
- Anomaly status
- Inspection result

## 1:15–1:40 — Snapdragon Edge AI

Show the Qualcomm AI Hub job/profile results.

Say:

"The trained YOLO11n model was exported to ONNX, compiled through Qualcomm AI Hub for the Snapdragon X Elite CRD, and successfully profiled using the ONNX Runtime QNN path."

Show:

- Snapdragon X Elite CRD
- Profile status: SUCCESS
- 0.740 ms minimum inference
- 0.747 ms median inference
- 34.45 MB reported inference peak memory

Say:

"These results were measured on Qualcomm AI Hub's hosted Snapdragon X Elite CRD."

## 1:40–1:55 — Full System

Return to the Dashboard.

Say:

"The result is a unified manufacturing intelligence platform combining sensor AI, anomaly detection, computer vision, database-backed inspection history, and a Snapdragon-ready Edge AI deployment path."

## 1:55–2:00 — Closing

Say:

"The goal is to help manufacturers detect machine abnormalities and product defects earlier through one connected AI system."

# Demo Rules

- Use the working Dashboard.
- Use the successful patches inspection example.
- Do not demonstrate failed model classes such as crazing or rolled-in-scale.
- Do not claim the AMD development laptop ran the Snapdragon NPU.
- Say "Qualcomm AI Hub hosted Snapdragon X Elite profiling."
- Do not claim the prototype uses a physical industrial camera.
- Do not call the health score a certified safety measurement.
