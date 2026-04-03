import torch
import numpy as np
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification
import librosa
import io

DEVICE = (
    "cuda" if torch.cuda.is_available()
    else "mps" if torch.backends.mps.is_available()
    else "cpu"
)

AUDIO_MODEL_ID  = "garystafford/wav2vec2-deepfake-voice-detector"
TARGET_SR       = 16000
MAX_DURATION_S  = 30

audio_extractor = None
audio_model     = None


def load_audio_model():
    global audio_extractor, audio_model
    print("[audio] Loading Wav2Vec2 model...")
    audio_extractor = AutoFeatureExtractor.from_pretrained(AUDIO_MODEL_ID)
    audio_model     = AutoModelForAudioClassification.from_pretrained(AUDIO_MODEL_ID).to(DEVICE)
    audio_model.eval()
    print("[audio] Wav2Vec2 loaded.")


def classify_audio(audio_bytes: bytes) -> dict:
    audio_array, sr = librosa.load(io.BytesIO(audio_bytes), sr=TARGET_SR, mono=True)

    max_samples = TARGET_SR * MAX_DURATION_S
    if len(audio_array) > max_samples:
        audio_array = audio_array[:max_samples]

    inputs = audio_extractor(
        audio_array,
        sampling_rate=TARGET_SR,
        return_tensors="pt",
        padding=True,
    ).to(DEVICE)

    with torch.no_grad():
        logits = audio_model(**inputs).logits

    probs     = torch.softmax(logits, dim=-1)[0]
    prob_real = probs[0].item()
    prob_fake = probs[1].item()

    label      = "fake" if prob_fake >= 0.5 else "real"
    confidence = prob_fake if label == "fake" else prob_real

    return {
        "media_type": "audio",
        "label":      label,
        "confidence": round(confidence, 4),
        "breakdown": {
            "prob_real": round(prob_real, 4),
            "prob_fake": round(prob_fake, 4),
            "model":     AUDIO_MODEL_ID,
        },
    }