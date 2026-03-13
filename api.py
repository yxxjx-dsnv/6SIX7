"""
Campus Pulse backend — exposes GET /api/buildings
Each floor is mapped to an image file. Rekognition counts people,
and occupancyPercent = (count / capacity) * 100.

To add a real building/floor, add an entry to BUILDINGS below and
point "image" at the photo for that floor (relative to this file).
"""

from flask import Flask, jsonify
import boto3
import os
from datetime import datetime

app = Flask(__name__)
rek = boto3.client("rekognition", region_name="us-west-2")

# ---------------------------------------------------------------------------
# Building / floor config — edit this to match your locations.
# "image" is the path to the photo for that floor (relative to api.py).
# "capacity" is the max number of people for that floor.
# ---------------------------------------------------------------------------
BUILDINGS = [
    {
        "id": "robarts-commons",
        "name": "Robarts Commons",
        "shortName": "Robarts",
        "emergency": False,
        "statusNote": "Live data from cameras.",
        "services": ["Study Space", "Quiet Zones", "Group Rooms"],
        "floors": [
            {"floor": "1F", "image": "images/robarts_1f.jpg", "capacity": 100},
            {"floor": "2F", "image": "images/robarts_2f.jpg", "capacity": 80},
            {"floor": "3F", "image": "images/robarts_3f.jpg", "capacity": 60},
        ],
    },
    {
        "id": "gerstein-library",
        "name": "Gerstein Science Information Centre",
        "shortName": "Gerstein",
        "emergency": False,
        "statusNote": "Live data from cameras.",
        "services": ["Silent Study", "Computers", "Medical Sciences"],
        "floors": [
            {"floor": "1F", "image": "images/gerstein_1f.jpg", "capacity": 80},
            {"floor": "2F", "image": "images/gerstein_2f.jpg", "capacity": 60},
        ],
    },
]


def count_people(image_path: str) -> int:
    """Run Rekognition on a local image and return the person count."""
    with open(image_path, "rb") as f:
        payload = f.read()
    response = rek.detect_labels(
        Image={"Bytes": payload},
        MinConfidence=70,
    )
    person_label = next(
        (label for label in response["Labels"] if label["Name"] == "Person"), None
    )
    return len(person_label["Instances"]) if person_label else 0


@app.route("/api/buildings")
def get_buildings():
    now = datetime.now().strftime("%-I:%M %p")
    result = []

    for building in BUILDINGS:
        floors = []
        for floor_cfg in building["floors"]:
            image_path = os.path.join(os.path.dirname(__file__), floor_cfg["image"])

            if not os.path.exists(image_path):
                # Skip floors with no image yet
                print(f"Warning: image not found for {building['id']} {floor_cfg['floor']}: {image_path}")
                continue

            count = count_people(image_path)
            pct = min(100, round((count / floor_cfg["capacity"]) * 100))
            floors.append({
                "floor": floor_cfg["floor"],
                "occupancyPercent": pct,
                "lastUpdated": now,
            })

        if not floors:
            continue

        avg_pct = round(sum(f["occupancyPercent"] for f in floors) / len(floors))
        result.append({
            "id": building["id"],
            "name": building["name"],
            "shortName": building["shortName"],
            "occupancyPercent": avg_pct,
            "emergency": building["emergency"],
            "statusNote": building["statusNote"],
            "services": building["services"],
            "lastUpdated": now,
            "floors": floors,
        })

    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
