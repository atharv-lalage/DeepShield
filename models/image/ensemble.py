from PIL import Image
import io
import torch
import cv2
import numpy as np

from models.image.vit_detector import get_fake_prob as vit_fake_prob, load_vit
from models.image.siglip_detector import get_fake_prob as siglip_fake_prob, load_siglip

VIT_WEIGHT    = 0.50
SIGLIP_WEIGHT = 0.50

DEVICE = (
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu"
)

face_cascade = None

def load_models():
    global face_cascade
    print("[ensemble] Loading OpenCV Face Detector...")
    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
    )
    load_vit()
    load_siglip()

def detect_face(pil_image):
    """Detect and crop face using OpenCV"""
    global face_cascade
    if face_cascade is None:
        return pil_image
    try:
        # Convert PIL → OpenCV format
        image_np = np.array(pil_image)
        gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
        
        faces = face_cascade.detectMultiScale(gray, 1.3, 5)
        if len(faces) > 0:
            x, y, w, h = faces[0]
            face = image_np[y:y+h, x:x+w]
            return Image.fromarray(face)
            
    except Exception as e:
        print(f"[ensemble] Face detection failed: {e}")
        
    return pil_image  # fallback

def classify_image(image_bytes: bytes) -> dict:
    original_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    
    # --- FACE DETECTION (OpenCV instead of MTCNN) ---
    focused_image = detect_face(original_image)
    
    # --- ROLE 1: ViT (Face Detective) ---
    vit_fake = vit_fake_prob(focused_image)
    
    # --- ROLE 2: SigLIP (Scene Detective) ---
    siglip_fake = siglip_fake_prob(original_image)
    
    # --- SMART OVERRIDE LOGIC WITH BOOSTING ---
    if vit_fake >= 0.65:                          # was 0.50 — too low
        final_fake_score = min(0.98, vit_fake * 1.3)  # was 1.5 — too aggressive
    elif siglip_fake >= 0.80:
        final_fake_score = siglip_fake
    else:
        final_fake_score = (VIT_WEIGHT * vit_fake) + (SIGLIP_WEIGHT * siglip_fake)
        
    final_real_score = 1.0 - final_fake_score
    confidence = max(final_fake_score, final_real_score)
    
    if final_fake_score >= 0.65:    # was 0.55
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
