"""Pre-download all models at Docker build time for faster cold starts."""
from transformers import AutoImageProcessor, AutoModelForImageClassification

models = [
    "dima806/deepfake_vs_real_image_detection",
    "prithivMLmods/deepfake-detector-model-v1",
]

for model_id in models:
    print(f"Downloading {model_id}...")
    AutoImageProcessor.from_pretrained(model_id)
    AutoModelForImageClassification.from_pretrained(model_id)

print("✅ All models pre-downloaded!")

