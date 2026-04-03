import asyncio
import sys
import os

from fastapi import APIRouter, File, UploadFile, HTTPException

sys.path.append(os.path.join(os.path.dirname(__file__), "../../.."))

from models.image.ensemble import classify_image
from models.audio.audio_detector import classify_audio
from models.video.frame_extractor import extract_frames
from models.video.video_utils import aggregate_frame_results
from ai_service.groq_service import generate_explanation

router = APIRouter()

ALLOWED_MIMETYPES = {
    "image/jpeg", "image/png", "image/webp", "image/gif",
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
    "audio/ogg", "audio/flac", "audio/mp4",
    "video/mp4", "video/quicktime", "video/x-msvideo",
    "video/webm", "video/mkv", "video/x-matroska",
}

FILE_SIZE_LIMITS = {
    "image": 20 * 1024 * 1024,   # 20MB
    "audio": 50 * 1024 * 1024,   # 50MB
    "video": 500 * 1024 * 1024,  # 500MB
}


def get_media_category(content_type: str) -> str | None:
    if content_type.startswith("image/"): return "image"
    if content_type.startswith("audio/"): return "audio"
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
        explanation = await generate_explanation("image", result)

        return format_response("image", file.filename, result, explanation)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Image analysis failed: {str(e)}")


# ─────────────────────────────────────────────────────────────────────────────
# Audio
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/detect/audio")
async def detect_audio(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_MIMETYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}")
    if not file.content_type.startswith("audio/"):
        raise HTTPException(400, f"Expected audio, got {file.content_type}")

    try:
        audio_bytes = await file.read()

        if len(audio_bytes) > FILE_SIZE_LIMITS["audio"]:
            raise HTTPException(413, "Audio files must be under 50MB")

        loop        = asyncio.get_event_loop()
        result      = await loop.run_in_executor(None, classify_audio, audio_bytes)
        explanation = await generate_explanation("audio", result)

        return format_response("audio", file.filename, result, explanation)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Audio analysis failed: {str(e)}")


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
        explanation = await generate_explanation("video", result)

        return format_response("video", file.filename, result, explanation)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Video analysis failed: {str(e)}")