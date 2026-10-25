import cv2
import numpy as np
from PIL import Image
import tempfile
import os
import io

NUM_FRAMES = 15


def extract_frames(video_bytes: bytes, num_frames: int = NUM_FRAMES):
    with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise ValueError("Could not open video file")

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        fps          = cap.get(cv2.CAP_PROP_FPS) or 25.0
        duration_s   = total_frames / fps

        num_frames = min(num_frames, total_frames)
        if num_frames < 1:
            raise ValueError("Video has no frames")

        indices = np.linspace(0, total_frames - 1, num_frames, dtype=int)

        frames = []
        for frame_index in indices:
            cap.set(cv2.CAP_PROP_POS_FRAMES, int(frame_index))
            ret, frame = cap.read()
            if not ret:
                continue

            rgb       = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(rgb)
            buf       = io.BytesIO()
            pil_image.save(buf, format="JPEG", quality=90)

            frames.append({
                "frame_index": int(frame_index),
                "timestamp_s": round(frame_index / fps, 2),
                "image_bytes": buf.getvalue(),
            })

    finally:
        cap.release()
        os.unlink(tmp_path)

    return frames, fps, duration_s