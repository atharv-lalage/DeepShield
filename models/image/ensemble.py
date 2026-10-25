"""
DeepShield — Ensemble Image Classifier (v2.0 — Diversity-Aware)
================================================================
Combines ViT (face forensics) and SigLIP (scene forensics) with:
  - RetinaFace for cross-ethnic face detection (replaces MTCNN)
  - CLAHE preprocessing for skin-tone-aware contrast enhancement
  - Recalibrated thresholds tuned for diverse demographics

Architecture:
  1. RetinaFace detects + crops the face (with CLAHE pre-boost if needed)
  2. CLAHE-enhanced face crop → ViT (forensic face analysis)
  3. Original full image → SigLIP (scene-level artifact detection)
  4. Smart ensemble logic merges both predictions
"""

from PIL import Image
import io
import torch
import numpy as np

from models.image.face_detector import load_face_detector, detect_and_crop_face
from models.image.preprocessing import preprocess_face, preprocess_for_detection
from models.image.vit_detector import get_fake_prob as vit_fake_prob, load_vit
from models.image.siglip_detector import get_fake_prob as siglip_fake_prob, load_siglip

# ── Ensemble weights ──────────────────────────────────────────────────────────
VIT_WEIGHT    = 0.60  # ViT is the primary forensic detector
SIGLIP_WEIGHT = 0.40  # SigLIP handles scene-level / fully-generative content

DEVICE = (
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu"
)


def load_models():
    """Load all models: face detector + ViT + SigLIP."""
    print("[ensemble] Loading face detector...")
    load_face_detector(device=DEVICE)
    print("[ensemble] Face detector ready.")
    load_vit()
    load_siglip()


def detect_face(pil_image: Image.Image) -> tuple[Image.Image, bool]:
    """
    Detect and crop the primary face with two-pass strategy:
      Pass 1: Try detection on original image
      Pass 2: If no face found, apply CLAHE preprocessing and retry
              (this dramatically helps with darker skin tones under poor lighting)
    
    Returns:
        tuple: (face_crop_PIL, face_was_detected)
    """
    # Pass 1: Try on original image
    face_crop, found = detect_and_crop_face(pil_image)
    if found:
        return face_crop, True

    # Pass 2: Enhance contrast and retry — catches dark skin under poor lighting
    print("[ensemble] Pass 1 failed — retrying with CLAHE-enhanced image...")
    enhanced = preprocess_for_detection(pil_image)
    face_crop, found = detect_and_crop_face(enhanced)
    if found:
        return face_crop, True

    # Fallback: no face detected at all
    print("[ensemble] No face detected after 2 passes — using full image as fallback.")
    return pil_image, False


def classify_image(image_bytes: bytes) -> dict:
    """
    Full ensemble classification pipeline:
      1. Open image
      2. Detect + crop face (RetinaFace with CLAHE fallback)
      3. Preprocess face crop (skin-tone-aware CLAHE)
      4. ViT analyzes the preprocessed face crop
      5. SigLIP analyzes the full original image
      6. Smart ensemble merges predictions with calibrated thresholds
    """
    original_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # ── FACE DETECTION (RetinaFace with two-pass strategy) ──
    focused_image, face_detected = detect_face(original_image)

    # ── PREPROCESSING (skin-tone-aware CLAHE) ──
    # Only preprocess if we actually found a face — preprocessing noise
    # on a full scene image would confuse SigLIP
    if face_detected:
        focused_image = preprocess_face(focused_image)

    # ── ROLE 1: ViT (Face Detective) ──
    vit_fake = vit_fake_prob(focused_image)

    # ── ROLE 2: SigLIP (Scene Detective) ──
    siglip_fake = siglip_fake_prob(original_image)

    # ── SMART ENSEMBLE LOGIC (v2 — recalibrated for diverse demographics) ──
    #
    # Key changes from v1:
    #   - ViT override threshold raised 0.65 → 0.72 (reduce false positives on Indian faces)
    #   - SigLIP override kept at 0.70 (scene detection is less skin-dependent)
    #   - Weighted blend uses 60/40 split (ViT slightly dominant)
    #   - Face-detection penalty: if no face was detected, we reduce ViT weight
    #     because ViT on a full scene is unreliable
    
    if face_detected:
        # Normal path: face was found, ViT analysis is reliable
        if vit_fake >= 0.72:
            final_fake_score = vit_fake
        elif siglip_fake >= 0.70:
            final_fake_score = siglip_fake
        else:
            final_fake_score = (VIT_WEIGHT * vit_fake) + (SIGLIP_WEIGHT * siglip_fake)
    else:
        # No face detected: ViT is analyzing full scene (less reliable)
        # Shift weight toward SigLIP which handles full scenes better
        if siglip_fake >= 0.70:
            final_fake_score = siglip_fake
        elif vit_fake >= 0.80:  # Much higher bar when ViT doesn't have a face crop
            final_fake_score = vit_fake
        else:
            final_fake_score = (0.35 * vit_fake) + (0.65 * siglip_fake)

    final_real_score = 1.0 - final_fake_score
    confidence = max(final_fake_score, final_real_score)

    # ── VERDICT THRESHOLDS (v2 — calibrated for diversity) ──
    if final_fake_score >= 0.68:
        label = "fake"
    elif final_fake_score <= 0.42:
        label = "real"
    else:
        label = "uncertain"

    return {
        "media_type": "image",
        "label":      label,
        "confidence": round(confidence, 4),
        "face_detected": face_detected,
        "ensemble_breakdown": {
            "vit_fake_prob":    round(vit_fake, 4),
            "siglip_fake_prob": round(siglip_fake, 4),
            "final_fake_score": round(final_fake_score, 4),
            "final_real_score": round(final_real_score, 4),
        },
    }