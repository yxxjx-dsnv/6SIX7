from sagemaker.serve.model_builder import ModelBuilder
from sagemaker.core.jumpstart.configs import JumpStartConfig

# New 2026 way to deploy a JumpStart model
model_builder = ModelBuilder.from_jumpstart_config(
    jumpstart_config=JumpStartConfig(model_id="mxnet-objdet-yolo3-darknet53-coco")
)
predictor = model_builder.deploy(initial_instance_count=1, instance_type="ml.m5.xlarge")

