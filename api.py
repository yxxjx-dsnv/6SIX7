"""
Campus Pulse backend — exposes GET /api/buildings
Pulls the latest occupancy reading per floor from DynamoDB.
"""

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
        ScanIndexForward=False,  # newest first
        Limit=1,
    )
    items = response.get("Items", [])
    return items[0] if items else None


@app.route("/api/buildings")
def get_buildings():
    result = []

    for building in BUILDINGS:
        floors = []
        for floor_cfg in building["floors"]:
            fid = floor_id(building["id"], floor_cfg["floor"])
            item = get_latest_floor_reading(fid)

            if item is None:
                continue  # no data yet for this floor

            # DynamoDB stores Decimals — convert to int for JSON
            pct = int(item["occupancy_percent"])
            ts = item["timestamp"]  # ISO 8601 string

            floors.append({
                "floor": floor_cfg["floor"],
                "occupancyPercent": pct,
                "lastUpdated": ts,
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
            "lastUpdated": floors[0]["lastUpdated"],
            "floors": floors,
        })

    return jsonify(result)


if __name__ == "__main__":
    app.run(port=5000, debug=True)
