from PIL import Image
import io
import torch
import numpy as np
from facenet_pytorch import MTCNN

from models.image.vit_detector import get_fake_prob as vit_fake_prob, load_vit
from models.image.siglip_detector import get_fake_prob as siglip_fake_prob, load_siglip

VIT_WEIGHT    = 0.50
SIGLIP_WEIGHT = 0.50

DEVICE = (
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu"
)

# MTCNN: keep_all=False → only the highest-confidence face
# margin=20 captures boundary artifacts (jawline, hairline) that fakes often expose
# post_process=False → returns raw pixel tensor, not normalized — we convert back to PIL
mtcnn = None


def load_models():
    global mtcnn
    print("[ensemble] Loading MTCNN face detector...")
    mtcnn = MTCNN(
        image_size=224,
        margin=20,
        keep_all=False,
        post_process=False,
        device=DEVICE,
    )
    print("[ensemble] MTCNN loaded.")
    load_vit()
    load_siglip()


def detect_face(pil_image: Image.Image) -> Image.Image:
    """
    Detect and crop the primary face using MTCNN.
    Returns the cropped face as a PIL Image, or the original image if no face found.
    """
    global mtcnn
    if mtcnn is None:
        return pil_image

    try:
        face_tensor = mtcnn(pil_image)  # shape: (3, 224, 224) or None

        if face_tensor is not None:
            # Convert tensor (0-255 float) back to uint8 PIL Image
            face_np = face_tensor.permute(1, 2, 0).cpu().numpy().astype(np.uint8)
            return Image.fromarray(face_np)

    except Exception as e:
        print(f"[ensemble] MTCNN face detection failed: {e}")

    # Fallback: use full image if no face detected
    print("[ensemble] No face detected — using full image as fallback.")
    return pil_image


def classify_image(image_bytes: bytes) -> dict:
    original_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # --- FACE DETECTION (MTCNN) ---
    # ViT gets the aligned face crop — it specialises in facial forensics
    # SigLIP gets the full original image — it catches scene-level artifacts
    focused_image = detect_face(original_image)

    # --- ROLE 1: ViT (Face Detective) ---
    vit_fake = vit_fake_prob(focused_image)

    # --- ROLE 2: SigLIP (Scene Detective) ---
    siglip_fake = siglip_fake_prob(original_image)

    # --- SMART OVERRIDE LOGIC WITH BOOSTING ---
    # Tightened override boundaries for Images
    # If ViT detects a FaceSwap -> Fake
    if vit_fake >= 0.65: 
        final_fake_score = vit_fake
    # If SigLIP detects a fully generative AI composition (like Midjourney/Grok) -> Fake
    elif siglip_fake >= 0.70: 
        final_fake_score = siglip_fake
    else:
        final_fake_score = (0.6 * vit_fake) + (0.4 * siglip_fake)

    final_real_score = 1.0 - final_fake_score
    confidence = max(final_fake_score, final_real_score)

    if final_fake_score >= 0.65:
        label = "fake"
    elif final_fake_score <= 0.40:
        label = "real"
    else:
        label = "uncertain"

    return {
        "media_type": "image",
        "label":      label,
        "confidence": round(confidence, 4),
        "ensemble_breakdown": {
            "vit_fake_prob":    round(vit_fake, 4),
            "siglip_fake_prob": round(siglip_fake, 4),
            "final_fake_score": round(final_fake_score, 4),
            "final_real_score": round(final_real_score, 4),
        },
    }