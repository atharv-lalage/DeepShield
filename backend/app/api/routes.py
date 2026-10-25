import asyncio
import sys
import os

from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from typing import Optional

sys.path.append(os.path.join(os.path.dirname(__file__), "../../.."))

from models.image.ensemble import classify_image
from models.video.frame_extractor import extract_frames
from models.video.video_utils import aggregate_frame_results
from ai_service.groq_service import generate_explanation

router = APIRouter()

ALLOWED_MIMETYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "video/webm", "video/mkv", "video/x-matroska",
}

FILE_SIZE_LIMITS = {
    "image": 20 * 1024 * 1024,   # 20MB
    "video": 500 * 1024 * 1024,  # 500MB
}


def get_media_category(content_type: str) -> Optional[str]:
    if content_type.startswith("image/"): return "image"
    if content_type.startswith("video/"): return "video"
    return None


def format_response(media_type: str, filename: str, result: dict, explanation: str) -> dict:
    return {
        "success":    True,
        "media_type": media_type,
        "filename":   filename,
        "verdict": {
            "label":      result["label"],
            "confidence": result["confidence"],
            "percentage": f"{result['confidence'] * 100:.1f}%",
            "is_fake":    result["label"] == "fake",
        },
        "explanation": explanation,
        "technical":   result,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/health")
def health():
    return {"status": "healthy"}


# ─────────────────────────────────────────────────────────────────────────────
# Explain
# ─────────────────────────────────────────────────────────────────────────────
class ExplainRequest(BaseModel):
    media_type: str
    result: dict

@router.post("/detect/explain")
async def explain(req: ExplainRequest):
    explanation = await generate_explanation(req.media_type, req.result)
    return {"explanation": explanation}


# ─────────────────────────────────────────────────────────────────────────────
# Image
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/detect/image")
async def detect_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_MIMETYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, f"Expected image, got {file.content_type}")

    try:
        image_bytes = await file.read()

        if len(image_bytes) > FILE_SIZE_LIMITS["image"]:
            raise HTTPException(413, "Image files must be under 20MB")

        loop        = asyncio.get_event_loop()
        result      = await loop.run_in_executor(None, classify_image, image_bytes)
        
        return format_response("image", file.filename, result, None)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Image analysis failed: {str(e)}")



# ─────────────────────────────────────────────────────────────────────────────
# Video
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/detect/video")
async def detect_video(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_MIMETYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    if not file.content_type.startswith("video/"):
        raise HTTPException(400, f"Expected video, got {file.content_type}")

    try:
        video_bytes = await file.read()

        if len(video_bytes) > FILE_SIZE_LIMITS["video"]:
            raise HTTPException(413, "Video files must be under 500MB")

        loop = asyncio.get_event_loop()

        frames, fps, duration_s = await loop.run_in_executor(
            None, extract_frames, video_bytes
        )

        if not frames:
            raise HTTPException(500, "No frames could be extracted from video")

        frame_results = []
        for frame in frames:
            r          = await loop.run_in_executor(None, classify_image, frame["image_bytes"])
            fake_score = r["ensemble_breakdown"]["final_fake_score"]
            frame_results.append({
                "frame_index": frame["frame_index"],
                "timestamp_s": frame["timestamp_s"],
                "label":       r["label"],
                "confidence":  r["confidence"],
                "fake_score":  fake_score,
            })

        result      = aggregate_frame_results(frame_results, fps, duration_s)
        
        return format_response("video", file.filename, result, None)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Video analysis failed: {str(e)}")