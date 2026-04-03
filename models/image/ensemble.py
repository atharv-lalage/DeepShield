from PIL import Image
import io
import torch
try:
    from facenet_pytorch import MTCNN
    FACENET_AVAILABLE = True
except ImportError:
    print("[ensemble] WARNING: facenet-pytorch dependency not found. Face cropping disabled.")
    FACENET_AVAILABLE = False
    MTCNN = None

from models.image.vit_detector import get_fake_prob as vit_fake_prob, load_vit
from models.image.siglip_detector import get_fake_prob as siglip_fake_prob, load_siglip

VIT_WEIGHT    = 0.50
SIGLIP_WEIGHT = 0.50

DEVICE = (
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu"
)

mtcnn = None

def load_models():
    global mtcnn
    if FACENET_AVAILABLE and MTCNN is not None:
        print("[ensemble] Loading MTCNN Face Cropper...")
        try:
            mtcnn = MTCNN(keep_all=False, device=DEVICE)
        except Exception as e:
            print(f"[ensemble] Failed to load MTCNN: {e}")
            mtcnn = None
    load_vit()
    load_siglip()

def classify_image(image_bytes: bytes) -> dict:
    original_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    focused_image = original_image

    # --- THE MTCNN FACE CROPPER ---
    global mtcnn
    if mtcnn is not None:
        try:
            boxes, _ = mtcnn.detect(original_image)
            if boxes is not None:
                box = boxes[0].tolist()
                focused_image = original_image.crop((box[0], box[1], box[2], box[3]))
        except Exception as e:
            print(f"[ensemble] Face crop failed: {e}")

    # --- ROLE 1: ViT (Face Detective) ---
    vit_fake = vit_fake_prob(focused_image)

    # --- ROLE 2: SigLIP (Scene Detective) ---
    siglip_fake = siglip_fake_prob(original_image)

    # --- SMART OVERRIDE LOGIC WITH BOOSTING ---
    # If ViT catches a face-swap, we multiply the score by 1.5 to boost system confidence!
    if vit_fake >= 0.50:
        final_fake_score = min(0.98, vit_fake * 1.5)
    # If SigLIP catches a Diffusion background, we use the high score directly
    elif siglip_fake >= 0.80:
        final_fake_score = siglip_fake
    # For borderline / real images, we use a balanced 50/50 average
    else:
        final_fake_score = (VIT_WEIGHT * vit_fake) + (SIGLIP_WEIGHT * siglip_fake)

    final_real_score = 1.0 - final_fake_score
    confidence = max(final_fake_score, final_real_score)

    if final_fake_score >= 0.55:
        label = "fake"
    elif final_fake_score <= 0.45:
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