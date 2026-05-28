"""
DeepShield — ViT Deepfake Detector (v2.0)
==========================================
Primary forensic face detector using Vision Transformer.

Loading priority:
  1. Local finetuned weights (models/weights/finetuned-vit/) — if available
  2. HuggingFace Hub fallback (dima806/deepfake_vs_real_image_detection)

The finetuned weights include Indian/South Asian face training data,
which significantly improves accuracy across diverse demographics.
"""

import os
import torch
from transformers import AutoImageProcessor, AutoModelForImageClassification
from PIL import Image

DEVICE = (
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu"
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FINETUNED_PATH = os.path.join(BASE_DIR, "models", "weights", "finetuned-vit")

# Fallback HuggingFace Hub model
HF_FALLBACK_MODEL = "dima806/deepfake_vs_real_image_detection"

vit_processor = None
vit_model = None
_model_source = None  # Track which weights we loaded for logging


def load_vit():
    global vit_processor, vit_model, _model_source
    
    # Check if finetuned weights exist locally
    config_path = os.path.join(FINETUNED_PATH, "config.json")
    
    if os.path.exists(config_path):
        print(f"[vit] Found finetuned weights at {FINETUNED_PATH}")
        print("[vit] Loading finetuned ViT model...")
        try:
            vit_processor = AutoImageProcessor.from_pretrained(FINETUNED_PATH)
            vit_model = AutoModelForImageClassification.from_pretrained(FINETUNED_PATH).to(DEVICE)
            vit_model.eval()
            _model_source = "finetuned-local"
            print("[vit] ✅ Finetuned ViT loaded (diversity-aware weights).")
            return
        except Exception as e:
            print(f"[vit] ⚠ Failed to load finetuned weights: {e}")
            print("[vit] Falling back to HuggingFace Hub model...")
    else:
        print(f"[vit] No finetuned weights found at {FINETUNED_PATH}")
        print("[vit] Using HuggingFace Hub model (run scripts/finetune.py to improve accuracy).")
    
    # Fallback to HuggingFace Hub
    print(f"[vit] Loading ViT from HuggingFace Hub: {HF_FALLBACK_MODEL}...")
    vit_processor = AutoImageProcessor.from_pretrained(HF_FALLBACK_MODEL)
    vit_model = AutoModelForImageClassification.from_pretrained(HF_FALLBACK_MODEL).to(DEVICE)
    vit_model.eval()
    _model_source = "huggingface-hub"
    print("[vit] ViT loaded (HuggingFace Hub fallback).")


def get_fake_prob(image: Image.Image) -> float:
    """id2label: {0: Deepfake, 1: Real} — returns prob of FAKE"""
    inputs = vit_processor(images=image, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        logits = vit_model(**inputs).logits
    probs = torch.softmax(logits, dim=-1)[0]
    return probs[0].item()


def get_model_info() -> dict:
    """Return info about which weights are loaded (useful for diagnostics)."""
    return {
        "model_source": _model_source,
        "finetuned_path": FINETUNED_PATH,
        "finetuned_exists": os.path.exists(os.path.join(FINETUNED_PATH, "config.json")),
        "hf_fallback": HF_FALLBACK_MODEL,
        "device": str(DEVICE),
    }