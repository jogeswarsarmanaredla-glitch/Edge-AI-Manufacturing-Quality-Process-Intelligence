import json
import sys
from pathlib import Path
from collections import Counter
from datetime import datetime

import cv2
from ultralytics import YOLO  # type: ignore[reportMissingImports]


# ============================================================
# DEPLOYMENT-SAFE PROJECT PATHS
# ============================================================

BACKEND_DIR = Path(__file__).resolve().parents[2]

MODEL_PATH = (
    BACKEND_DIR
    / "runs"
    / "neu_defect_baseline"
    / "weights"
    / "best.pt"
)

# Directory for original and annotated inspection images
ANNOTATED_DIR = (
    BACKEND_DIR
    / "uploads"
    / "inspections"
)

ANNOTATED_DIR.mkdir(
    parents=True,
    exist_ok=True,
)


# Based on the validation F1-confidence curve.
DETECTION_CONFIDENCE = 0.28


# Application-level interpretation rule.
# This is not a model metric; it is used to avoid presenting
# lower-confidence detections as confirmed defects.
CONFIRMED_DEFECT_CONFIDENCE = 0.50


# ============================================================
# SAVE ANNOTATED IMAGE
# ============================================================

def save_annotated_image(
    result,
    image_path: Path,
):
    """
    Save the YOLO-rendered image with bounding boxes and labels.
    """

    annotated = result.plot()

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S_%f"
    )

    annotated_filename = (
        f"annotated_{timestamp}_{image_path.stem}.jpg"
    )

    annotated_path = (
        ANNOTATED_DIR / annotated_filename
    )

    # Ultralytics returns a BGR image suitable for cv2.imwrite.
    success = cv2.imwrite(
        str(annotated_path),
        annotated,
    )

    if not success:
        raise RuntimeError(
            "Failed to save annotated inspection image."
        )

    return annotated_path


# ============================================================
# MAIN
# ============================================================

def main():

    if len(sys.argv) != 2:

        print(
            json.dumps(
                {
                    "status": "error",
                    "message": (
                        "Usage: inspect_cv.py <image_path>"
                    ),
                }
            )
        )

        raise SystemExit(1)


    image_path = Path(
        sys.argv[1]
    )


    # ========================================================
    # CHECK MODEL
    # ========================================================

    if not MODEL_PATH.exists():

        print(
            json.dumps(
                {
                    "status": "error",
                    "message": (
                        f"CV model not found: {MODEL_PATH}"
                    ),
                }
            )
        )

        raise SystemExit(1)


    # ========================================================
    # CHECK IMAGE
    # ========================================================

    if not image_path.exists():

        print(
            json.dumps(
                {
                    "status": "error",
                    "message": (
                        f"Inspection image not found: "
                        f"{image_path}"
                    ),
                }
            )
        )

        raise SystemExit(1)


    try:

        # ====================================================
        # LOAD YOLO MODEL
        # ====================================================

        model = YOLO(
            str(MODEL_PATH)
        )


        # ====================================================
        # RUN INFERENCE
        # ====================================================

        results = model.predict(
            source=str(image_path),
            imgsz=256,
            conf=DETECTION_CONFIDENCE,
            device="cpu",
            verbose=False,
            save=False,
        )


        result = results[0]

        detections = []


        # ====================================================
        # EXTRACT DETECTIONS
        # ====================================================

        if (
            result.boxes is not None
            and len(result.boxes) > 0
        ):

            class_ids = (
                result.boxes.cls.tolist()
            )

            confidences = (
                result.boxes.conf.tolist()
            )

            boxes = (
                result.boxes.xyxy.tolist()
            )


            for class_id, confidence, box in zip(
                class_ids,
                confidences,
                boxes,
            ):

                class_id = int(
                    class_id
                )

                confidence = float(
                    confidence
                )


                class_name = model.names.get(
                    class_id,
                    str(class_id),
                )


                detections.append(
                    {
                        "class_name": class_name,

                        "confidence": confidence,

                        "confidence_percent": round(
                            confidence * 100,
                            2,
                        ),

                        "bbox": {
                            "x1": round(
                                float(box[0]),
                                2,
                            ),

                            "y1": round(
                                float(box[1]),
                                2,
                            ),

                            "x2": round(
                                float(box[2]),
                                2,
                            ),

                            "y2": round(
                                float(box[3]),
                                2,
                            ),
                        },
                    }
                )


        # ====================================================
        # ALWAYS CREATE ANNOTATED IMAGE
        # ====================================================

        annotated_path = (
            save_annotated_image(
                result,
                image_path,
            )
        )


        # ====================================================
        # NO DETECTIONS
        # ====================================================

        if not detections:

            output = {
                "status": "ok",

                "result": "Pass",

                "confidence": None,

                "defect_count": 0,

                "defect_details": (
                    "No supported surface defect "
                    "detected by the CV model."
                ),

                "detections": [],

                "annotated_image_path": str(
                    annotated_path
                ),

                "annotated_image_filename": (
                    annotated_path.name
                ),
            }


        # ====================================================
        # DETECTIONS FOUND
        # ====================================================

        else:

            counts = Counter(
                detection["class_name"]
                for detection in detections
            )


            max_confidence = max(
                detection["confidence"]
                for detection in detections
            )


            summary = []


            for class_name, count in counts.items():

                summary.append(
                    f"{class_name} ({count})"
                )


            # =================================================
            # CONFIRMED VS LOWER-CONFIDENCE
            # =================================================

            if (
                max_confidence
                >= CONFIRMED_DEFECT_CONFIDENCE
            ):

                inspection_result = "Defect"

                detail_prefix = "Detected: "


            else:

                inspection_result = (
                    "Review Recommended"
                )

                detail_prefix = (
                    "Possible defect detected: "
                )


            output = {

                "status": "ok",

                "result": inspection_result,

                "confidence": round(
                    max_confidence * 100,
                    2,
                ),

                "defect_count": len(
                    detections
                ),

                "defect_details": (
                    detail_prefix
                    + ", ".join(summary)
                ),

                "detections": detections,

                "annotated_image_path": str(
                    annotated_path
                ),

                "annotated_image_filename": (
                    annotated_path.name
                ),
            }


        # ====================================================
        # RETURN JSON
        # ====================================================

        print(
            json.dumps(
                output,
                ensure_ascii=False,
            )
        )


    except Exception as error:

        print(
            json.dumps(
                {
                    "status": "error",

                    "message": (
                        "CV inspection failed."
                    ),

                    "error": str(error),
                }
            )
        )

        raise SystemExit(1)


# ============================================================
# START
# ============================================================

if __name__ == "__main__":
    main()