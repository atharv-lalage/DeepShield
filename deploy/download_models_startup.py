"""Pre-download all models at Docker build time for faster cold starts."""
from transformers import AutoImageProcessor, AutoModelForImageClassification
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

models = [
    ("dima806/deepfake_vs_real_image_detection", "image"),
    ("prithivMLmods/deepfake-detector-model-v1", "image"),
    ("garystafford/wav2vec2-deepfake-voice-detector", "audio"),
]

for model_id, model_type in models:
    print(f"Downloading {model_id}...")
    if model_type == "image":
        AutoImageProcessor.from_pretrained(model_id)
        AutoModelForImageClassification.from_pretrained(model_id)
    else:
        AutoFeatureExtractor.from_pretrained(model_id)
        AutoModelForAudioClassification.from_pretrained(model_id)

print("✅ All models pre-downloaded!")
