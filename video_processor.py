"""
Video processor — reads an MP4, samples frames at a fixed interval,
counts people with Rekognition, and pushes occupancy data to DynamoDB.

Usage (process all configured floors):
    python video_processor.py

Usage (process a single video for a specific floor, for quick testing):
    python video_processor.py --video videos/demo.mp4 --floor-id robarts-commons#1F --capacity 100
"""

import argparse
import queue
import sys
import threading
import time
import cv2
import boto3
from datetime import datetime, timezone
from config import BUILDINGS, DYNAMO_TABLE, AWS_REGION, VIDEO_SAMPLE_INTERVAL_SECONDS, floor_id

rek = boto3.client("rekognition", region_name=AWS_REGION)
dynamo = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamo.Table(DYNAMO_TABLE)


def detect_people(frame):
    """Encode a CV2 frame as JPEG and run Rekognition person detection.
    Returns (count, list of BoundingBox dicts)."""
    _, buffer = cv2.imencode(".jpg", frame)
    response = rek.detect_labels(
        Image={"Bytes": buffer.tobytes()},
        MinConfidence=70,
    )
    person_label = next(
        (label for label in response["Labels"] if label["Name"] == "Person"), None
    )
    if not person_label:
        return 0, []
    boxes = [inst["BoundingBox"] for inst in person_label["Instances"] if "BoundingBox" in inst]
    return len(person_label["Instances"]), boxes


def draw_boxes(frame, boxes):
    """Draw Rekognition bounding boxes on a copy of the frame."""
    h, w = frame.shape[:2]
    out = frame.copy()
    for box in boxes:
        x1 = int(box["Left"] * w)
        y1 = int(box["Top"] * h)
        x2 = int((box["Left"] + box["Width"]) * w)
        y2 = int((box["Top"] + box["Height"]) * h)
        cv2.rectangle(out, (x1, y1), (x2, y2), (0, 255, 0), 2)
    return out


def count_people_in_frame(frame) -> int:
    """Legacy wrapper — returns only the count."""
    count, _ = detect_people(frame)
    return count


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


def _video_worker(video_path: str, fid: str, building_id: str,
                  building_name: str, floor: str, capacity: int,
                  loop: bool, frame_queue: "queue.Queue | None"):
    """Background thread: reads frames, calls Rekognition, pushes to DynamoDB,
    and puts annotated frames into frame_queue for the main thread to display."""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"ERROR: cannot open video: {video_path}", file=sys.stderr)
        return

    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frame_interval = max(1, int(fps * VIDEO_SAMPLE_INTERVAL_SECONDS))
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration_s = total_frames / fps
    loop_label = "looping" if loop else "once"
    print(f"\n→ {video_path} | {duration_s:.0f}s | sampling every {VIDEO_SAMPLE_INTERVAL_SECONDS}s | {loop_label} | floor: {fid}")

    frame_delay = 1.0 / fps  # seconds to wait between frames to match real-time speed

    frame_num = 0
    last_boxes: list = []
    last_count: int = 0
    while cap.isOpened():
        t0 = time.monotonic()

        ret, frame = cap.read()
        if not ret:
            if loop:
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                frame_num = 0
                print(f"  ↺ Looping {video_path}")
                continue
            break

        if frame_num % frame_interval == 0:
            last_count, last_boxes = detect_people(frame)
            push_to_dynamo(fid, building_id, building_name, floor, last_count, capacity)

        if frame_queue is not None:
            annotated = draw_boxes(frame, last_boxes)
            label = f"{fid}  |  {last_count} person(s)"
            cv2.putText(annotated, label, (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            try:
                frame_queue.put_nowait(annotated)
            except queue.Full:
                pass

        frame_num += 1

        # Pace to real video speed so Rekognition fires every VIDEO_SAMPLE_INTERVAL_SECONDS
        elapsed = time.monotonic() - t0
        sleep_for = frame_delay - elapsed
        if sleep_for > 0:
            time.sleep(sleep_for)

    cap.release()


def run_all(loop: bool = True, display: bool = True):
    """Spin up one thread per floor, then display all windows from the main thread."""
    windows: list[tuple[str, queue.Queue]] = []
    threads: list[threading.Thread] = []

    for building in BUILDINGS:
        for floor_cfg in building["floors"]:
            fid = floor_id(building["id"], floor_cfg["floor"])
            frame_q: "queue.Queue | None" = None
            if display:
                frame_q = queue.Queue(maxsize=2)
                window_name = f"Campus Pulse — {fid}"
                windows.append((window_name, frame_q))
                cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
                cv2.resizeWindow(window_name, 640, 360)

            t = threading.Thread(
                target=_video_worker,
                args=(floor_cfg["video"], fid, building["id"],
                      building["name"], floor_cfg["floor"],
                      floor_cfg["capacity"], loop, frame_q),
                daemon=True,
            )
            t.start()
            threads.append(t)

    if display:
        print(f"\nShowing {len(windows)} window(s). Press 'q' in any window to quit all.\n")
        while True:
            for window_name, q in windows:
                try:
                    frame = q.get_nowait()
                    cv2.imshow(window_name, frame)
                except queue.Empty:
                    pass
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        cv2.destroyAllWindows()
    else:
        print(f"\nProcessing {len(threads)} floor(s) in the background (no display). Ctrl+C to stop.\n")
        for t in threads:
            t.join()


def run_single(video_path: str, fid: str, capacity: int, loop: bool = True, display: bool = True):
    """Process a single video for a given floor_id (quick demo/test)."""
    building_id, floor = fid.split("#", 1)
    frame_q: "queue.Queue | None" = None

    if display:
        frame_q = queue.Queue(maxsize=2)
        window_name = f"Campus Pulse — {fid}"
        cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
        cv2.resizeWindow(window_name, 640, 360)

    t = threading.Thread(
        target=_video_worker,
        args=(video_path, fid, building_id, building_id, floor, capacity, loop, frame_q),
        daemon=True,
    )
    t.start()

    if display and frame_q is not None:
        while t.is_alive() or not frame_q.empty():
            try:
                frame = frame_q.get_nowait()
                cv2.imshow(window_name, frame)
            except queue.Empty:
                pass
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
        cv2.destroyAllWindows()
    else:
        t.join()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--video", help="Path to a single MP4 to process")
    parser.add_argument("--floor-id", help='Floor ID, e.g. "robarts-commons#1F"')
    parser.add_argument("--capacity", type=int, default=100, help="Max capacity for this floor")
    parser.add_argument("--no-loop", action="store_true", help="Process video once and stop")
    parser.add_argument("--display", action="store_true", help="Show OpenCV windows with Rekognition bounding boxes")
    args = parser.parse_args()

    loop = not args.no_loop
    display = args.display
    if args.video:
        if not args.floor_id:
            parser.error("--floor-id is required when --video is specified")
        run_single(args.video, args.floor_id, args.capacity, loop=loop, display=display)
    else:
        run_all(loop=loop, display=display)
