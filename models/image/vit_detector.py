import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image

DEVICE = (
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu"
)

import os
# BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
VIT_MODEL_ID = "dima806/deepfake_vs_real_image_detection" # Fallback to HF hub model since local is empty
vit_processor = None
vit_model = None


def load_vit():
    global vit_processor, vit_model
    print("[vit] Loading ViT model...")
    vit_processor = AutoImageProcessor.from_pretrained(VIT_MODEL_ID)
    vit_model = AutoModelForImageClassification.from_pretrained(VIT_MODEL_ID).to(DEVICE)
    vit_model.eval()
    print("[vit] ViT loaded.")


def get_fake_prob(image: Image.Image) -> float:
    """id2label: {0: Deepfake, 1: Real} — returns prob of FAKE"""
    inputs = vit_processor(images=image, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        logits = vit_model(**inputs).logits
    probs = torch.softmax(logits, dim=-1)[0]
    return probs[0].item()