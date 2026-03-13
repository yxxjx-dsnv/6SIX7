"""
Campus Pulse backend — exposes GET /api/buildings
Pulls the latest occupancy reading per floor from DynamoDB,
plus a rolling hourly trend for the past 12 hours.
"""

from collections import defaultdict
from datetime import datetime, timezone, timedelta
from flask import Flask, jsonify
import boto3
from boto3.dynamodb.conditions import Key
from config import BUILDINGS, DYNAMO_TABLE, AWS_REGION, floor_id

app = Flask(__name__)
dynamo = boto3.resource("dynamodb", region_name=AWS_REGION)
table = dynamo.Table(DYNAMO_TABLE)


def get_latest_floor_reading(fid: str) -> dict | None:
    """Return the most recent DynamoDB item for a floor, or None."""
    response = table.query(
        KeyConditionExpression=Key("floor_id").eq(fid),
        ScanIndexForward=False,
        Limit=1,
    )
    items = response.get("Items", [])
    return items[0] if items else None


def get_floor_history(fid: str, hours: int = 12) -> list[dict]:
    """Return all readings for a floor from the past `hours` hours, oldest first."""
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    response = table.query(
        KeyConditionExpression=Key("floor_id").eq(fid) & Key("timestamp").gte(since),
        ScanIndexForward=True,
    )
    return response.get("Items", [])


def build_hourly_trend(all_floor_histories: list[list[dict]]) -> list[dict]:
    """
    Bucket readings across all floors into 30-minute slots,
    average the occupancy, and return a sorted list of
    {time: "2:30PM", occupancyPercent: 45} dicts.
    """
    buckets: dict[tuple[int, int], list[int]] = defaultdict(list)

    for readings in all_floor_histories:
        for item in readings:
            ts = datetime.fromisoformat(item["timestamp"]).astimezone()
            # Round down to nearest 30-minute boundary
            slot_minute = 0 if ts.minute < 30 else 30
            buckets[(ts.hour, slot_minute)].append(int(item["occupancy_percent"]))

    trend = []
    for (hour, minute) in sorted(buckets):
        avg = round(sum(buckets[(hour, minute)]) / len(buckets[(hour, minute)]))
        # Format label: "2:30PM", "9AM", "12PM", etc.
        h12 = hour % 12 or 12
        suffix = "AM" if hour < 12 else "PM"
        label = f"{h12}:{minute:02d}{suffix}" if minute else f"{h12}{suffix}"
        trend.append({"time": label, "occupancyPercent": avg})

    return trend


@app.route("/api/buildings")
def get_buildings():
    result = []

    for building in BUILDINGS:
        floors = []
        all_histories = []

        for floor_cfg in building["floors"]:
            fid = floor_id(building["id"], floor_cfg["floor"])
            item = get_latest_floor_reading(fid)

            if item is None:
                continue

            pct = int(item["occupancy_percent"])
            ts = item["timestamp"]

            floors.append({
                "floor": floor_cfg["floor"],
                "occupancyPercent": pct,
                "lastUpdated": ts,
            })

            history = get_floor_history(fid)
            if history:
                all_histories.append(history)

        if not floors:
            continue

        avg_pct = round(sum(f["occupancyPercent"] for f in floors) / len(floors))
        hourly_trend = build_hourly_trend(all_histories)

        result.append({
            "id": building["id"],
            "name": building["name"],
            "shortName": building["shortName"],
            "occupancyPercent": avg_pct,
            "emergency": building["emergency"],
            "statusNote": building["statusNote"],
            "services": building["services"],
            "lastUpdated": floors[0]["lastUpdated"],
            "floors": floors,
            "hourlyTrend": hourly_trend,
        })

    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
