import numpy as np

FAKE_THRESHOLD = 0.40


def aggregate_frame_results(frame_results: list, fps: float, duration_s: float) -> dict:
    total          = len(frame_results)
    fakes          = [f for f in frame_results if f["label"] == "fake"]
    reals          = [f for f in frame_results if f["label"] == "real"]
    fake_ratio     = len(fakes) / total if total > 0 else 0.0
    avg_fake_score = np.mean([f["fake_score"] for f in frame_results]) if frame_results else 0.0

    label      = "fake" if fake_ratio >= FAKE_THRESHOLD else "real"
    confidence = float(avg_fake_score) if label == "fake" else float(1.0 - avg_fake_score)

    return {
        "media_type": "video",
        "label":      label,
        "confidence": round(confidence, 4),
        "frame_summary": {
            "total_frames_analyzed": total,
            "fake_frames":           len(fakes),
            "real_frames":           len(reals),
            "fake_ratio":            round(fake_ratio, 4),
            "avg_fake_score":        round(avg_fake_score, 4),
            "video_duration_s":      round(duration_s, 2),
            "fps":                   round(fps, 2),
        },
        "frame_details": [
            {
                "frame_index": f["frame_index"],
                "timestamp_s": f["timestamp_s"],
                "label":       f["label"],
                "confidence":  f["confidence"],
                "fake_score":  f["fake_score"],
            }
            for f in frame_results
        ],
    }