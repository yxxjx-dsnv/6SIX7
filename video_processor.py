"""
Video processor — reads an MP4, samples frames at a fixed interval,
counts people with Rekognition, and pushes occupancy data to DynamoDB.

Usage (process all configured floors):
    python video_processor.py

Usage (process a single video for a specific floor, for quick testing):
    python video_processor.py --video videos/demo.mp4 --floor-id robarts-commons#1F --capacity 100
"""

import argparse
import sys
import cv2
import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime, timezone
from config import BUILDINGS, DYNAMO_TABLE, AWS_REGION, VIDEO_SAMPLE_INTERVAL_SECONDS, floor_id

rek = boto3.client("rekognition", region_name=AWS_REGION)
dynamo = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamo.Table(DYNAMO_TABLE)


def count_people_in_frame(frame) -> int:
    """Encode a CV2 frame as JPEG and run Rekognition person detection."""
    _, buffer = cv2.imencode(".jpg", frame)
    response = rek.detect_labels(
        Image={"Bytes": buffer.tobytes()},
        MinConfidence=70,
    )
    person_label = next(
        (label for label in response["Labels"] if label["Name"] == "Person"), None
    )
    return len(person_label["Instances"]) if person_label else 0


def push_to_dynamo(fid: str, building_id: str, building_name: str,
                   floor: str, count: int, capacity: int):
    ts = datetime.now(timezone.utc).isoformat()
    pct = min(100, round((count / capacity) * 100))
    table.put_item(Item={
        "floor_id": fid,
        "timestamp": ts,
        "building_id": building_id,
        "building_name": building_name,
        "floor": floor,
        "person_count": count,
        "capacity": capacity,
        "occupancy_percent": pct,
    })
    print(f"[{ts}] {fid}: {count} people → {pct}%")
    return pct


def process_video(video_path: str, fid: str, building_id: str,
                  building_name: str, floor: str, capacity: int):
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: cannot open video: {video_path}", file=sys.stderr)
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_interval = max(1, int(fps * VIDEO_SAMPLE_INTERVAL_SECONDS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_s = total_frames / fps
    print(f"\n→ {video_path} | {duration_s:.0f}s | sampling every {VIDEO_SAMPLE_INTERVAL_SECONDS}s | floor: {fid}")

    frame_num = 0
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
        if frame_num % frame_interval == 0:
            count = count_people_in_frame(frame)
            push_to_dynamo(fid, building_id, building_name, floor, count, capacity)
        frame_num += 1

    cap.release()
    print(f"✓ Done processing {video_path}")


def run_all():
    """Process every video defined in config.py."""
    for building in BUILDINGS:
        for floor_cfg in building["floors"]:
            fid = floor_id(building["id"], floor_cfg["floor"])
            process_video(
                video_path=floor_cfg["video"],
                fid=fid,
                building_id=building["id"],
                building_name=building["name"],
                floor=floor_cfg["floor"],
                capacity=floor_cfg["capacity"],
            )


def run_single(video_path: str, fid: str, capacity: int):
    """Process a single video for a given floor_id (quick demo/test)."""
    building_id, floor = fid.split("#", 1)
    process_video(
        video_path=video_path,
        fid=fid,
        building_id=building_id,
        building_name=building_id,
        floor=floor,
        capacity=capacity,
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", help="Path to a single MP4 to process")
    parser.add_argument("--floor-id", help='Floor ID, e.g. "robarts-commons#1F"')
    parser.add_argument("--capacity", type=int, default=100, help="Max capacity for this floor")
    args = parser.parse_args()

    if args.video:
        if not args.floor_id:
            parser.error("--floor-id is required when --video is specified")
        run_single(args.video, args.floor_id, args.capacity)
    else:
        run_all()
