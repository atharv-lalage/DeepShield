# DeepShield — Deployment Guide 🚀

> Step-by-step guide to deploying DeepShield for free. Frontend on Vercel, Backend on HuggingFace Spaces (with free GPU!).

---

## 📋 Deployment Overview

| Component | Platform | Cost | Why This One? |
|-----------|----------|------|---------------|
| **Frontend** (React) | **Vercel** | ✅ Free | Instant deploys from GitHub, global CDN, custom domain |
| **Backend** (FastAPI + AI models) | **HuggingFace Spaces** | ✅ Free (T4 GPU!) | 16GB RAM, free T4 GPU, Docker support, perfect for ML |
| **LLM** (LLaMA 3.3 70B) | **Groq API** | ✅ Free tier | You already have this — no changes needed |

### Alternative Free Platforms

| Platform | Free Tier | GPU? | RAM | Best For |
|----------|-----------|------|-----|----------|
| **HuggingFace Spaces** ⭐ | Unlimited | T4 (free!) | 16GB | ML backends — **recommended** |
| **Vercel** ⭐ | 100GB bandwidth/mo | No | — | React frontends — **recommended** |
| **Render** | 750 hrs/mo | No | 512MB | Simple APIs (too small for our models) |
| **Railway** | $5 free credit | No | 512MB | Small projects |
| **Netlify** | 100GB bandwidth/mo | No | — | Static sites |
| **Cloudflare Pages** | Unlimited | No | — | Static sites |
| **Google Cloud Run** | 2M requests/mo | No | 512MB | Stateless APIs |

> **Why HuggingFace Spaces?** It's the only free platform that gives you a **free T4 GPU** and 16GB RAM — exactly what we need for PyTorch model inference.

---

## Part 1: Deploy Backend on HuggingFace Spaces

### Step 1: Create a HuggingFace Account

1. Go to [huggingface.co](https://huggingface.co) and sign up (free)
2. Go to [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
3. Create a new token with **Write** access — save it somewhere safe

### Step 2: Upload Finetuned Weights to HuggingFace Hub

Your finetuned weights (343MB) need to be hosted somewhere accessible. Upload them to a HuggingFace model repo:

```bash
# Install HuggingFace CLI
pip install huggingface_hub

# Login
huggingface-cli login
# Paste your token when prompted

# Upload your finetuned weights
huggingface-cli upload YOUR_USERNAME/deepshield-vit-finetuned models/weights/finetuned-vit/ .
```

Replace `YOUR_USERNAME` with your HuggingFace username. This creates a model repo at `https://huggingface.co/YOUR_USERNAME/deepshield-vit-finetuned`.

### Step 3: Create a HuggingFace Space

1. Go to [huggingface.co/new-space](https://huggingface.co/new-space)
2. Fill in:
   - **Space name**: `deepshield-api`
   - **License**: MIT
   - **SDK**: Docker
   - **Hardware**: **T4 small** (free!) — or **CPU basic** if T4 isn't available
   - **Visibility**: Public (required for free GPU)
3. Click **Create Space**

### Step 4: Create Deployment Files

Create a new folder called `deploy/` in your project and add these files:

#### `deploy/Dockerfile`
```dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements first (Docker cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Download models at build time (they'll be cached in the Docker image)
RUN python download_models_startup.py

# Expose port (HuggingFace Spaces uses 7860)
EXPOSE 7860

# Start the server
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
```

#### `deploy/requirements.txt`
```text
# Server
fastapi==0.115.0
uvicorn[standard]==0.32.0
python-multipart==0.0.12

# ML & Models
torch==2.6.0
torchvision==0.21.0
transformers==4.47.0
huggingface-hub>=0.25.0
Pillow>=10.0.0
numpy>=1.24.0
opencv-python-headless>=4.8.0
librosa>=0.10.0
soundfile>=0.12.0

# Face Detection
insightface>=0.7.3
onnxruntime>=1.16.0

# Groq AI
groq>=0.4.0

# Utilities
python-dotenv>=1.0.0
aiofiles>=23.0.0
```

#### `deploy/app.py`
This is a self-contained FastAPI app for deployment:

```python
"""
DeepShield API — HuggingFace Spaces Deployment
================================================
Self-contained FastAPI app with all model loading and inference.
"""

import os
import io
import asyncio
import tempfile
from contextlib import asynccontextmanager

import cv2
import torch
import numpy as np
import librosa
from PIL import Image
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    AutoFeatureExtractor,
    AutoModelForAudioClassification,
)
from groq import Groq

# ─── Device Detection ───────────────────────────────────────────────────────
DEVICE = (
    "cuda" if torch.cuda.is_available()
    else "mps" if hasattr(torch.backends, "mps") and torch.backends.mps.is_available()
    else "cpu"
)
print(f"[init] Device: {DEVICE}")

# ─── Model IDs ──────────────────────────────────────────────────────────────
# Replace YOUR_USERNAME with your HuggingFace username
FINETUNED_VIT_ID = os.environ.get(
    "FINETUNED_VIT_MODEL",
    "YOUR_USERNAME/deepshield-vit-finetuned"
)
FALLBACK_VIT_ID = "dima806/deepfake_vs_real_image_detection"
SIGLIP_MODEL_ID = "prithivMLmods/deepfake-detector-model-v1"
AUDIO_MODEL_ID = "garystafford/wav2vec2-deepfake-voice-detector"

# ─── Global Model References ────────────────────────────────────────────────
vit_processor = None
vit_model = None
siglip_processor = None
siglip_model = None
audio_extractor = None
audio_model = None
face_detector = None


# ═══════════════════════════════════════════════════════════════════════════════
# MODEL LOADING
# ═══════════════════════════════════════════════════════════════════════════════

def load_all_models():
    """Load all models at startup."""
    global vit_processor, vit_model, siglip_processor, siglip_model
    global audio_extractor, audio_model, face_detector

    # ViT (try finetuned first)
    try:
        print(f"[vit] Loading finetuned model: {FINETUNED_VIT_ID}")
        vit_processor = AutoImageProcessor.from_pretrained(FINETUNED_VIT_ID)
        vit_model = AutoModelForImageClassification.from_pretrained(FINETUNED_VIT_ID).to(DEVICE)
        vit_model.eval()
        print("[vit] ✅ Finetuned ViT loaded.")
    except Exception as e:
        print(f"[vit] Finetuned model not found ({e}), using fallback...")
        vit_processor = AutoImageProcessor.from_pretrained(FALLBACK_VIT_ID)
        vit_model = AutoModelForImageClassification.from_pretrained(FALLBACK_VIT_ID).to(DEVICE)
        vit_model.eval()
        print(f"[vit] ViT loaded from {FALLBACK_VIT_ID}")

    # SigLIP
    print(f"[siglip] Loading SigLIP: {SIGLIP_MODEL_ID}")
    siglip_processor = AutoImageProcessor.from_pretrained(SIGLIP_MODEL_ID)
    siglip_model = AutoModelForImageClassification.from_pretrained(SIGLIP_MODEL_ID).to(DEVICE)
    siglip_model.eval()
    print("[siglip] ✅ SigLIP loaded.")

    # Audio
    print(f"[audio] Loading Wav2Vec2: {AUDIO_MODEL_ID}")
    audio_extractor = AutoFeatureExtractor.from_pretrained(AUDIO_MODEL_ID)
    audio_model = AutoModelForAudioClassification.from_pretrained(AUDIO_MODEL_ID).to(DEVICE)
    audio_model.eval()
    print("[audio] ✅ Wav2Vec2 loaded.")

    # Face detector
    try:
        from insightface.app import FaceAnalysis
        print("[face] Loading RetinaFace...")
        app = FaceAnalysis(
            name="buffalo_sc",
            providers=(
                ["CUDAExecutionProvider", "CPUExecutionProvider"]
                if DEVICE == "cuda" else ["CPUExecutionProvider"]
            ),
        )
        app.prepare(ctx_id=0 if DEVICE == "cuda" else -1, det_size=(640, 640))
        face_detector = app
        print("[face] ✅ RetinaFace loaded.")
    except Exception as e:
        print(f"[face] RetinaFace unavailable ({e}), using full-image fallback")
        face_detector = None

    print("[init] ✅ All models loaded!")


# ═══════════════════════════════════════════════════════════════════════════════
# PREPROCESSING
# ═══════════════════════════════════════════════════════════════════════════════

def apply_clahe(image, clip_limit=2.5, grid_size=8):
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(grid_size, grid_size))
    l = clahe.apply(l)
    return cv2.cvtColor(cv2.merge([l, a, b]), cv2.COLOR_LAB2BGR)


def preprocess_face(pil_image):
    cv2_img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
    avg_l = np.mean(cv2.cvtColor(cv2_img, cv2.COLOR_BGR2LAB)[:, :, 0])

    if avg_l > 170:
        params = {"clip_limit": 1.5, "grid_size": 8}
    elif avg_l > 120:
        params = {"clip_limit": 2.5, "grid_size": 8}
    else:
        params = {"clip_limit": 3.5, "grid_size": 6}

    result = apply_clahe(cv2_img, **params)
    return Image.fromarray(cv2.cvtColor(result, cv2.COLOR_BGR2RGB))


def detect_face(pil_image):
    if face_detector is None:
        return pil_image, False

    try:
        cv2_img = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        faces = face_detector.get(cv2_img)

        if faces:
            best = max(faces, key=lambda f: f.det_score)
            if best.det_score >= 0.5:
                bbox = best.bbox.astype(int)
                h, w = cv2_img.shape[:2]
                mx = int((bbox[2] - bbox[0]) * 0.15)
                my = int((bbox[3] - bbox[1]) * 0.15)
                x1 = max(0, bbox[0] - mx)
                y1 = max(0, bbox[1] - my)
                x2 = min(w, bbox[2] + mx)
                y2 = min(h, bbox[3] + my)
                crop = cv2.resize(cv2_img[y1:y2, x1:x2], (224, 224))
                return Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)), True

        # Two-pass: try with CLAHE
        enhanced = apply_clahe(cv2_img, 2.0, 8)
        faces = face_detector.get(enhanced)
        if faces:
            best = max(faces, key=lambda f: f.det_score)
            if best.det_score >= 0.5:
                bbox = best.bbox.astype(int)
                h, w = cv2_img.shape[:2]
                mx = int((bbox[2] - bbox[0]) * 0.15)
                my = int((bbox[3] - bbox[1]) * 0.15)
                x1 = max(0, bbox[0] - mx)
                y1 = max(0, bbox[1] - my)
                x2 = min(w, bbox[2] + mx)
                y2 = min(h, bbox[3] + my)
                crop = cv2.resize(cv2_img[y1:y2, x1:x2], (224, 224))
                return Image.fromarray(cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)), True
    except Exception as e:
        print(f"[face] Detection error: {e}")

    return pil_image, False


# ═══════════════════════════════════════════════════════════════════════════════
# INFERENCE
# ═══════════════════════════════════════════════════════════════════════════════

def classify_image(image_bytes):
    original = Image.open(io.BytesIO(image_bytes)).convert("RGB")

    # Face detection + preprocessing
    focused, face_detected = detect_face(original)
    if face_detected:
        focused = preprocess_face(focused)

    # ViT (face)
    inputs = vit_processor(images=focused, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        vit_fake = torch.softmax(vit_model(**inputs).logits, dim=-1)[0][0].item()

    # SigLIP (scene)
    inputs = siglip_processor(images=original, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        siglip_fake = torch.softmax(siglip_model(**inputs).logits, dim=-1)[0][0].item()

    # Ensemble
    if face_detected:
        if vit_fake >= 0.72:
            score = vit_fake
        elif siglip_fake >= 0.70:
            score = siglip_fake
        else:
            score = 0.60 * vit_fake + 0.40 * siglip_fake
    else:
        if siglip_fake >= 0.70:
            score = siglip_fake
        elif vit_fake >= 0.80:
            score = vit_fake
        else:
            score = 0.35 * vit_fake + 0.65 * siglip_fake

    confidence = max(score, 1 - score)
    label = "fake" if score >= 0.68 else ("real" if score <= 0.42 else "uncertain")

    return {
        "media_type": "image",
        "label": label,
        "confidence": round(confidence, 4),
        "face_detected": face_detected,
        "ensemble_breakdown": {
            "vit_fake_prob": round(vit_fake, 4),
            "siglip_fake_prob": round(siglip_fake, 4),
            "final_fake_score": round(score, 4),
            "final_real_score": round(1 - score, 4),
        },
    }


def classify_audio(audio_bytes):
    audio_array, sr = librosa.load(io.BytesIO(audio_bytes), sr=16000, mono=True)
    audio_array = audio_array[:16000 * 30]  # Max 30s

    inputs = audio_extractor(audio_array, sampling_rate=16000, return_tensors="pt", padding=True).to(DEVICE)
    with torch.no_grad():
        probs = torch.softmax(audio_model(**inputs).logits, dim=-1)[0]

    prob_real, prob_fake = probs[0].item(), probs[1].item()
    label = "fake" if prob_fake >= 0.5 else "real"

    return {
        "media_type": "audio",
        "label": label,
        "confidence": round(max(prob_real, prob_fake), 4),
        "breakdown": {"prob_real": round(prob_real, 4), "prob_fake": round(prob_fake, 4)},
    }


# ═══════════════════════════════════════════════════════════════════════════════
# LLM EXPLANATION
# ═══════════════════════════════════════════════════════════════════════════════

def generate_explanation(media_type, result):
    try:
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            return f"Classified as {result['label']} with {result['confidence']*100:.1f}% confidence."

        client = Groq(api_key=api_key)
        label = result["label"]
        pct = f"{result['confidence']*100:.1f}"

        if media_type == "image":
            bd = result.get("ensemble_breakdown", {})
            prompt = f"""You are a deepfake detection expert. An AI ensemble analyzed an image.
Result: {label.upper()} ({pct}% confidence)
ViT model fake probability: {bd.get('vit_fake_prob', 'N/A')}
SigLIP model fake probability: {bd.get('siglip_fake_prob', 'N/A')}

Write 2-3 sentences explaining this result to a non-technical user."""
        else:
            prompt = f"A deepfake detection system analyzed a {media_type} and returned: {label.upper()} with {pct}% confidence. Explain in 2-3 sentences."

        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=400, temperature=0.4,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        return f"Classified as {result['label']} with {result['confidence']*100:.1f}% confidence."


# ═══════════════════════════════════════════════════════════════════════════════
# FASTAPI APP
# ═══════════════════════════════════════════════════════════════════════════════

@asynccontextmanager
async def lifespan(app):
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, load_all_models)
    yield

app = FastAPI(title="DeepShield API", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for deployed frontend
    allow_methods=["*"],
    allow_headers=["*"],
)


def format_response(media_type, filename, result, explanation):
    return {
        "success": True,
        "media_type": media_type,
        "filename": filename,
        "verdict": {
            "label": result["label"],
            "confidence": result["confidence"],
            "percentage": f"{result['confidence'] * 100:.1f}%",
            "is_fake": result["label"] == "fake",
        },
        "explanation": explanation,
        "technical": result,
    }


@app.get("/")
def root():
    return {"status": "ok", "service": "deepshield-api", "version": "2.0.0", "device": DEVICE}


@app.get("/health")
def health():
    return {"status": "healthy", "device": DEVICE}


@app.post("/detect/image")
async def detect_image(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        if len(image_bytes) > 20 * 1024 * 1024:
            raise HTTPException(413, "Image must be under 20MB")

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, classify_image, image_bytes)
        return format_response("image", file.filename, result, None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")


@app.post("/detect/audio")
async def detect_audio(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()
        if len(audio_bytes) > 50 * 1024 * 1024:
            raise HTTPException(413, "Audio must be under 50MB")

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, classify_audio, audio_bytes)
        return format_response("audio", file.filename, result, None)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Analysis failed: {str(e)}")


class ExplainRequest(BaseModel):
    media_type: str
    result: dict

@app.post("/detect/explain")
async def explain(req: ExplainRequest):
    explanation = generate_explanation(req.media_type, req.result)
    return {"explanation": explanation}
```

#### `deploy/download_models_startup.py`
```python
"""Pre-download all models at Docker build time for faster startup."""
from transformers import AutoImageProcessor, AutoModelForImageClassification
from transformers import AutoFeatureExtractor, AutoModelForAudioClassification

models = [
    ("dima806/deepfake_vs_real_image_detection", "image"),
    ("prithivMLmods/deepfake-detector-model-v1", "image"),
    ("garystafford/wav2vec2-deepfake-voice-detector", "audio"),
]

for model_id, model_type in models:
    print(f"Downloading {model_id}...")
    if model_type == "image":
        AutoImageProcessor.from_pretrained(model_id)
        AutoModelForImageClassification.from_pretrained(model_id)
    else:
        AutoFeatureExtractor.from_pretrained(model_id)
        AutoModelForAudioClassification.from_pretrained(model_id)

print("✅ All models pre-downloaded!")
```

### Step 5: Push to HuggingFace Space

```bash
# Clone your Space
git clone https://huggingface.co/spaces/YOUR_USERNAME/deepshield-api
cd deepshield-api

# Copy deploy files
copy ..\deploy\Dockerfile .
copy ..\deploy\requirements.txt .
copy ..\deploy\app.py .
copy ..\deploy\download_models_startup.py .

# Add your Groq API key as a Space secret (NOT in code!)
# Go to: huggingface.co/spaces/YOUR_USERNAME/deepshield-api/settings
# Add secret: GROQ_API_KEY = your_key_here

# Push to deploy
git add .
git commit -m "Deploy DeepShield API v2.0"
git push
```

### Step 6: Verify Backend

Once the Space builds (5-10 minutes), your API will be live at:
```
https://YOUR_USERNAME-deepshield-api.hf.space
```

Test it:
```
https://YOUR_USERNAME-deepshield-api.hf.space/health
→ {"status": "healthy", "device": "cuda"}
```

---

## Part 2: Deploy Frontend on Vercel

### Step 1: Create a Vercel Account

1. Go to [vercel.com](https://vercel.com) and sign up with GitHub (free)

### Step 2: Update Frontend API URL

Before deploying, update the frontend to point to your deployed backend.

Find the API base URL in your frontend code and change it:

```bash
# Find where the API URL is configured
grep -r "localhost:8000" frontend/src/
```

Update it to use an environment variable:

Create `frontend/.env.production`:
```env
VITE_API_URL=https://YOUR_USERNAME-deepshield-api.hf.space
```

Then in your frontend API service file, use:
```javascript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

### Step 3: Deploy to Vercel

**Option A — Via Vercel CLI:**
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy from frontend directory
cd frontend
vercel

# Follow the prompts:
#   - Link to existing project? No
#   - Project name: deepshield
#   - Framework: Vite
#   - Root directory: ./
#   - Build command: npm run build
#   - Output directory: dist

# Set environment variable
vercel env add VITE_API_URL
# Enter: https://YOUR_USERNAME-deepshield-api.hf.space

# Deploy to production
vercel --prod
```

**Option B — Via Vercel Dashboard (easier):**

1. Push your project to GitHub
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variable:
   - Key: `VITE_API_URL`
   - Value: `https://YOUR_USERNAME-deepshield-api.hf.space`
6. Click **Deploy**

### Step 4: Verify Frontend

Your frontend will be live at:
```
https://deepshield.vercel.app
```
(or whatever Vercel assigns — you can also add a custom domain for free)

---

## Part 3: Connect Frontend ↔ Backend

### Update Frontend API Service

Check your API service file and update it to support both local dev and production:

```javascript
// frontend/src/services/api.js (or wherever your API calls are)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function detectImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/detect/image`, {
        method: 'POST',
        body: formData,
    });
    return response.json();
}

export async function detectAudio(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_BASE}/detect/audio`, {
        method: 'POST',
        body: formData,
    });
    return response.json();
}

export async function getExplanation(mediaType, result) {
    const response = await fetch(`${API_BASE}/detect/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_type: mediaType, result }),
    });
    return response.json();
}
```

---

## Part 4: Upload Finetuned Weights to HuggingFace

If you want your deployed backend to use your finetuned weights:

### Step 1: Create a Model Repository

```bash
# Login
huggingface-cli login

# Create the repo and upload weights
huggingface-cli upload YOUR_USERNAME/deepshield-vit-finetuned models/weights/finetuned-vit/ .
```

### Step 2: Add as Environment Variable

In your HuggingFace Space settings, add:
```
FINETUNED_VIT_MODEL = YOUR_USERNAME/deepshield-vit-finetuned
```

The `app.py` reads this variable and loads your finetuned weights automatically.

---

## Part 5: Quick Reference — Complete Deployment Checklist

```
□ Step 1:  Create HuggingFace account + API token
□ Step 2:  Upload finetuned weights to HuggingFace Hub
           huggingface-cli upload YOUR_USERNAME/deepshield-vit-finetuned models/weights/finetuned-vit/ .
□ Step 3:  Create HuggingFace Space (Docker, T4 GPU)
□ Step 4:  Copy deploy files (Dockerfile, app.py, requirements.txt)
□ Step 5:  Add GROQ_API_KEY as Space secret
□ Step 6:  Push to Space → wait for build (5-10 min)
□ Step 7:  Test API: https://YOUR_USERNAME-deepshield-api.hf.space/health
□ Step 8:  Create Vercel account (GitHub login)
□ Step 9:  Create frontend/.env.production with VITE_API_URL
□ Step 10: Deploy frontend to Vercel (import GitHub repo)
□ Step 11: Add VITE_API_URL env var in Vercel dashboard
□ Step 12: Test full flow: upload image on Vercel frontend → HF Space API
□ Step 13: Share the link! 🎉
```

---

## 🔧 Troubleshooting

### "Space keeps restarting"
- Check build logs at `huggingface.co/spaces/YOUR_USERNAME/deepshield-api/logs`
- Most common issue: OOM (out of memory). Switch to CPU if T4 isn't available

### "CORS error in browser console"
- The deployed `app.py` already has `allow_origins=["*"]`
- Make sure you're using the correct API URL in the frontend

### "Models take too long to load"
- First startup takes ~2-3 minutes (downloading models)
- Subsequent startups are faster (models cached in Docker layer)
- HuggingFace Spaces may sleep after 48 hours of inactivity — first request after sleep takes ~3 min

### "Groq API not working"
- Make sure `GROQ_API_KEY` is set as a **Secret** in Space settings (not hardcoded)
- The free Groq tier has rate limits — the app handles this gracefully with fallback text

### "Frontend shows 'Failed to fetch'"
- Check that `VITE_API_URL` is set correctly (no trailing slash)
- Verify the Space is running: visit the API URL directly in browser
- Check browser console for the actual error

---

## 🌐 After Deployment — Your Live URLs

| Component | URL |
|-----------|-----|
| **Frontend** | `https://deepshield.vercel.app` |
| **Backend API** | `https://YOUR_USERNAME-deepshield-api.hf.space` |
| **API Docs** | `https://YOUR_USERNAME-deepshield-api.hf.space/docs` |
| **Model Weights** | `https://huggingface.co/YOUR_USERNAME/deepshield-vit-finetuned` |

> **Pro tip for resume**: Add the live URL to your resume! A deployed, working project is 10× more impressive than a GitHub repo alone.
