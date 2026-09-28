# Snapdragon AI Deployment Record

## Model
- Model: Custom YOLO11n surface-defect detector
- Source dataset: NEU-DET
- Input size: 256x256
- Export format: ONNX
- Cleaned model: best_clean.onnx

## Qualcomm AI Hub
- Compile Job: jp2rqdw4g
- Target Model: mn752o53m
- Device: Snapdragon X Elite CRD
- OS: Windows 11
- Profile Job: jp3zl79l5
- Runtime path: ONNX Runtime + QNN
- Profile status: SUCCESS

## Profile Results
- Minimum inference time: 0.740 ms
- Median inference time: 0.747 ms
- Reported inference peak memory: 34.45 MB
- First load time: 2.655 s
- Warm load time: 0.616 s
- Inference memory increase: 1.85 MB
- Inference peak memory increase: 5.09 MB

## Important Deployment Note
These profiling results were obtained on Qualcomm AI Hub's hosted
Snapdragon X Elite CRD. The development laptop used for this project
is AMD Ryzen-based and was not used as a Snapdragon NPU device.
