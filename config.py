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
            {"floor": "1F", "capacity": 100, "video": "videos/robarts.mp4"},
            {"floor": "2F", "capacity": 80,  "video": "videos/robarts.mp4"},
            {"floor": "3F", "capacity": 60,  "video": "videos/robarts.mp4"},
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
            {"floor": "1F", "capacity": 80, "video": "videos/gerstein.mp4"},
            {"floor": "2F", "capacity": 60, "video": "videos/gerstein.mp4"},
        ],
    },
    {
        "id": "bahen-centre",
        "name": "Bahen Centre for Information Technology",
        "shortName": "Bahen",
        "emergency": False,
        "statusNote": "Live data from cameras.",
        "services": ["Labs", "Study Space", "Lecture Halls"],
        "floors": [
            {"floor": "2F", "capacity": 100, "video": "videos/bahen.mp4"},
            {"floor": "3F", "capacity": 80,  "video": "videos/bahen.mp4"},
            {"floor": "1F", "capacity": 120, "video": "videos/bahen.mp4"},
            {"floor": "4F", "capacity": 80,  "video": "videos/bahen.mp4"},
        ],
    },
    {
        "id": "sidney-smith",
        "name": "Sidney Smith Hall",
        "shortName": "Sidney Smith",
        "emergency": False,
        "statusNote": "Live data from cameras.",
        "services": ["Study Area", "Classrooms", "Transit Nearby"],
        "floors": [
            {"floor": "1F", "capacity": 100, "video": "videos/sidney.mp4"},
            {"floor": "2F", "capacity": 80,  "video": "videos/sidney.mp4"},
            {"floor": "3F", "capacity": 80,  "video": "videos/sidney.mp4"},
            {"floor": "4F", "capacity": 60,  "video": "videos/sidney.mp4"},
        ],
    },
]

def floor_id(building_id: str, floor: str) -> str:
    return f"{building_id}#{floor}"
