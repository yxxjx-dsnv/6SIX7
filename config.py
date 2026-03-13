"""
Shared building/floor configuration.
- "floor_id" is the DynamoDB partition key: "<building_id>#<floor>"
- "capacity" is the max number of people for that floor (used for % calculation)
- "video" is the MP4 path to use for that floor (relative to project root)
"""

DYNAMO_TABLE = "campus-pulse-occupancy"
AWS_REGION = "us-west-2"

# Sample one frame every N seconds of video
VIDEO_SAMPLE_INTERVAL_SECONDS = 10

BUILDINGS = [
    {
        "id": "robarts-commons",
        "name": "Robarts Commons",
        "shortName": "Robarts",
        "emergency": False,
        "statusNote": "Live data from cameras.",
        "services": ["Study Space", "Quiet Zones", "Group Rooms"],
        "floors": [
            {"floor": "1F", "capacity": 100, "video": "videos/robarts_1f.mp4"},
            {"floor": "2F", "capacity": 80,  "video": "videos/robarts_2f.mp4"},
            {"floor": "3F", "capacity": 60,  "video": "videos/robarts_3f.mp4"},
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
            {"floor": "1F", "capacity": 80, "video": "videos/gerstein_1f.mp4"},
            {"floor": "2F", "capacity": 60, "video": "videos/gerstein_2f.mp4"},
        ],
    },
]

def floor_id(building_id: str, floor: str) -> str:
    return f"{building_id}#{floor}"
