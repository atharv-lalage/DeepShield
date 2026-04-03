from PIL import Image
import io
from models.image.vit_detector import get_fake_prob as vit_fake_prob, load_vit
from models.image.siglip_detector import get_fake_prob as siglip_fake_prob, load_siglip

VIT_WEIGHT    = 0.4
SIGLIP_WEIGHT = 0.6


def load_models():
    load_vit()
    load_siglip()


def classify_image(image_bytes: bytes) -> dict:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    vit_fake    = vit_fake_prob(image)
    siglip_fake = siglip_fake_prob(image)

    final_fake_score = (VIT_WEIGHT * vit_fake) + (SIGLIP_WEIGHT * siglip_fake)
    final_real_score = 1.0 - final_fake_score
    confidence = max(final_fake_score, final_real_score)

    if final_fake_score >= 0.70:
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