import boto3

rek = boto3.client("rekognition", region_name="us-west-2")

with open("image2.jpg", "rb") as f:
    payload = f.read()

response = rek.detect_labels(
    Image={"Bytes": payload},
    MinConfidence=70,
)

# Each "Person" label instance corresponds to one detected person
person_label = next((l for l in response["Labels"] if l["Name"] == "Person"), None)
count = len(person_label["Instances"]) if person_label else 0
print(f"Number of people detected: {count}")
