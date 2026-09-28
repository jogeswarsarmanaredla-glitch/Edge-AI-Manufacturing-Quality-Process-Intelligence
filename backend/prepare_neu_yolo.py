from pathlib import Path
import random
import shutil
import xml.etree.ElementTree as ET

# ============================================================
# NEU-DET -> YOLO DATASET PREPARATION
# ============================================================

PROJECT_ROOT = Path(r"C:\ManufacturingAI")

SOURCE_ROOT = (
    PROJECT_ROOT
    / "backend"
    / "data"
    / "neu_surface_defect"
    / "extracted"
    / "NEU-DET"
)

IMAGES_DIR = SOURCE_ROOT / "IMAGES"
ANNOTATIONS_DIR = SOURCE_ROOT / "ANNOTATIONS"

OUTPUT_ROOT = (
    PROJECT_ROOT
    / "backend"
    / "data"
    / "neu_yolo"
)

TRAIN_IMAGES = OUTPUT_ROOT / "images" / "train"
VAL_IMAGES = OUTPUT_ROOT / "images" / "val"
TRAIN_LABELS = OUTPUT_ROOT / "labels" / "train"
VAL_LABELS = OUTPUT_ROOT / "labels" / "val"

CLASS_NAMES_FILE = OUTPUT_ROOT / "classes.txt"
DATA_YAML_FILE = OUTPUT_ROOT / "data.yaml"

TRAIN_RATIO = 0.80
RANDOM_SEED = 42


def parse_annotation(xml_path: Path):
    root = ET.parse(xml_path).getroot()

    filename_node = root.find("filename")
    size_node = root.find("size")

    if filename_node is None or size_node is None:
        raise ValueError(f"Missing filename/size in {xml_path.name}")

    filename = filename_node.text.strip()
    width = int(size_node.find("width").text)
    height = int(size_node.find("height").text)

    objects = []

    for obj in root.findall("object"):
        name_node = obj.find("name")
        bbox = obj.find("bndbox")

        if name_node is None or bbox is None:
            continue

        class_name = name_node.text.strip()

        xmin = float(bbox.find("xmin").text)
        ymin = float(bbox.find("ymin").text)
        xmax = float(bbox.find("xmax").text)
        ymax = float(bbox.find("ymax").text)

        objects.append(
            {
                "class_name": class_name,
                "xmin": xmin,
                "ymin": ymin,
                "xmax": xmax,
                "ymax": ymax,
            }
        )

    if not objects:
        raise ValueError(f"No objects found in {xml_path.name}")

    return filename, width, height, objects


def convert_box(xmin, ymin, xmax, ymax, width, height):
    # Clamp coordinates to image boundaries.
    xmin = max(0.0, min(xmin, width))
    ymin = max(0.0, min(ymin, height))
    xmax = max(0.0, min(xmax, width))
    ymax = max(0.0, min(ymax, height))

    box_width = xmax - xmin
    box_height = ymax - ymin

    if box_width <= 0 or box_height <= 0:
        raise ValueError(
            f"Invalid bounding box: "
            f"{xmin}, {ymin}, {xmax}, {ymax}"
        )

    center_x = (xmin + xmax) / 2.0
    center_y = (ymin + ymax) / 2.0

    return (
        center_x / width,
        center_y / height,
        box_width / width,
        box_height / height,
    )


def main():
    print("=" * 70)
    print("NEU-DET -> YOLO DATASET PREPARATION")
    print("=" * 70)

    if not IMAGES_DIR.exists():
        raise FileNotFoundError(
            f"Images directory not found:\n{IMAGES_DIR}"
        )

    if not ANNOTATIONS_DIR.exists():
        raise FileNotFoundError(
            f"Annotations directory not found:\n{ANNOTATIONS_DIR}"
        )

    xml_files = sorted(ANNOTATIONS_DIR.glob("*.xml"))

    print(f"Annotation files found: {len(xml_files)}")

    if not xml_files:
        raise RuntimeError("No XML annotation files found.")

    records = []
    class_names = set()

    for xml_path in xml_files:
        filename, width, height, objects = parse_annotation(xml_path)

        image_path = IMAGES_DIR / filename

        if not image_path.exists():
            # Fall back to stem.jpg if XML filename differs in extension.
            image_path = IMAGES_DIR / f"{xml_path.stem}.jpg"

        if not image_path.exists():
            raise FileNotFoundError(
                f"Image not found for {xml_path.name}: {filename}"
            )

        for obj in objects:
            class_names.add(obj["class_name"])

        records.append(
            {
                "xml_path": xml_path,
                "image_path": image_path,
                "filename": filename,
                "width": width,
                "height": height,
                "objects": objects,
            }
        )

    class_names = sorted(class_names)
    class_to_id = {
        name: index for index, name in enumerate(class_names)
    }

    print("\nClasses discovered:")
    for name, class_id in class_to_id.items():
        print(f"  {class_id}: {name}")

    # --------------------------------------------------------
    # Group records by primary class for a balanced split.
    # --------------------------------------------------------

    grouped = {}

    for record in records:
        primary_class = record["objects"][0]["class_name"]
        grouped.setdefault(primary_class, []).append(record)

    random.seed(RANDOM_SEED)

    train_records = []
    val_records = []

    for class_name in sorted(grouped):
        items = grouped[class_name][:]
        random.shuffle(items)

        split_index = int(len(items) * TRAIN_RATIO)

        # Ensure a validation sample exists if possible.
        if len(items) > 1:
            split_index = min(
                max(split_index, 1),
                len(items) - 1,
            )

        train_records.extend(items[:split_index])
        val_records.extend(items[split_index:])

    random.shuffle(train_records)
    random.shuffle(val_records)

    # --------------------------------------------------------
    # Create output directories.
    # --------------------------------------------------------

    for directory in [
        TRAIN_IMAGES,
        VAL_IMAGES,
        TRAIN_LABELS,
        VAL_LABELS,
    ]:
        directory.mkdir(parents=True, exist_ok=True)

    # --------------------------------------------------------
    # Write YOLO labels + copy images.
    # --------------------------------------------------------

    def process_records(records_list, image_dir, label_dir):
        for record in records_list:
            image_source = record["image_path"]
            image_destination = image_dir / image_source.name

            shutil.copy2(
                image_source,
                image_destination,
            )

            label_path = (
                label_dir
                / f"{image_source.stem}.txt"
            )

            lines = []

            for obj in record["objects"]:
                class_id = class_to_id[
                    obj["class_name"]
                ]

                cx, cy, w, h = convert_box(
                    obj["xmin"],
                    obj["ymin"],
                    obj["xmax"],
                    obj["ymax"],
                    record["width"],
                    record["height"],
                )

                lines.append(
                    f"{class_id} "
                    f"{cx:.6f} "
                    f"{cy:.6f} "
                    f"{w:.6f} "
                    f"{h:.6f}"
                )

            label_path.write_text(
                "\n".join(lines),
                encoding="utf-8",
            )

    process_records(
        train_records,
        TRAIN_IMAGES,
        TRAIN_LABELS,
    )

    process_records(
        val_records,
        VAL_IMAGES,
        VAL_LABELS,
    )

    # --------------------------------------------------------
    # Write class list.
    # --------------------------------------------------------

    CLASS_NAMES_FILE.write_text(
        "\n".join(class_names),
        encoding="utf-8",
    )

    # --------------------------------------------------------
    # Write YOLO data.yaml.
    # --------------------------------------------------------

    yaml_lines = [
        "path: C:/ManufacturingAI/backend/data/neu_yolo",
        "train: images/train",
        "val: images/val",
        "",
        f"nc: {len(class_names)}",
        "names:",
    ]

    for class_id, class_name in enumerate(class_names):
        yaml_lines.append(
            f"  {class_id}: {class_name}"
        )

    DATA_YAML_FILE.write_text(
        "\n".join(yaml_lines) + "\n",
        encoding="utf-8",
    )

    print("\n" + "=" * 70)
    print("DATASET PREPARATION COMPLETE")
    print("=" * 70)

    print(f"Total images: {len(records)}")
    print(f"Training images: {len(train_records)}")
    print(f"Validation images: {len(val_records)}")
    print(f"Number of classes: {len(class_names)}")

    print("\nOutput:")
    print(OUTPUT_ROOT)

    print("\nCreated:")
    print(DATA_YAML_FILE)
    print(CLASS_NAMES_FILE)


if __name__ == "__main__":
    main()
