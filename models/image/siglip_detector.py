import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image

DEVICE = (
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu"
)

SIGLIP_MODEL_ID = "prithivMLmods/deepfake-detector-model-v1"
siglip_processor = None
siglip_model = None


def load_siglip():
    global siglip_processor, siglip_model
    print("[siglip] Loading SigLIP model...")
    siglip_processor = AutoImageProcessor.from_pretrained(SIGLIP_MODEL_ID)
    siglip_model = AutoModelForImageClassification.from_pretrained(SIGLIP_MODEL_ID).to(DEVICE)
    siglip_model.eval()
    print("[siglip] SigLIP loaded.")


def get_fake_prob(image: Image.Image) -> float:
    """id2label: {0: fake, 1: real} — returns prob of FAKE"""
    inputs = siglip_processor(images=image, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        logits = siglip_model(**inputs).logits
    probs = torch.softmax(logits, dim=-1)[0]
    return probs[0].item()