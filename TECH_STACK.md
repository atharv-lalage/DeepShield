# DeepShield — Technical Architecture Document

> Detailed engineering deep-dive into the DeepShield deepfake detection system.
> Covers every layer from frontend rendering to GPU tensor operations, ensemble logic, and bias mitigation.

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Frontend Architecture](#2-frontend-architecture)
3. [Backend & API Pipeline](#3-backend--api-pipeline)
4. [Image Detection Pipeline (v2.0)](#4-image-detection-pipeline-v20)
5. [Face Detection — RetinaFace](#5-face-detection--retinaface)
6. [Skin-Tone-Aware Preprocessing](#6-skin-tone-aware-preprocessing)
7. [ViT — Vision Transformer Detector](#7-vit--vision-transformer-detector)
8. [SigLIP — Scene-Level Detector](#8-siglip--scene-level-detector)
9. [Ensemble Logic (v2.0)](#9-ensemble-logic-v20)
10. [Audio Detection Pipeline](#10-audio-detection-pipeline)
11. [Video Detection Pipeline](#11-video-detection-pipeline)
12. [Explainable AI (LLaMA 3.3)](#12-explainable-ai-llama-33)
13. [Diversity & Bias Mitigation](#13-diversity--bias-mitigation)
14. [Finetuning Pipeline](#14-finetuning-pipeline)
15. [Evaluation Pipeline](#15-evaluation-pipeline)
16. [Deployment & Hardware](#16-deployment--hardware)

---

## 1. System Overview

DeepShield is a **multi-modal forensic AI system** built on a 3-tier architecture:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  TIER 1: Presentation Layer (React + Vite)                             │
│  Glassmorphic UI, drag-and-drop, real-time analysis rendering          │
├─────────────────────────────────────────────────────────────────────────┤
│  TIER 2: Application Layer (FastAPI + Uvicorn)                         │
│  Async route handlers, CORS, file validation, thread-pool execution    │
├─────────────────────────────────────────────────────────────────────────┤
│  TIER 3: AI/ML Layer (PyTorch + HuggingFace)                           │
│  ViT, SigLIP, RetinaFace, Wav2Vec2, CLAHE preprocessing               │
│  + Groq API for LLaMA 3.3 70B inference                                │
└─────────────────────────────────────────────────────────────────────────┘
```

**Request Flow:**
1. User drops a file in the UI
2. Frontend sends `POST /detect/{image|audio|video}` to FastAPI
3. FastAPI validates file type/size, dispatches to thread pool executor
4. AI models run inference (GPU/CPU), return structured predictions
5. Frontend renders verdict + requests `/detect/explain` for natural language analysis
6. Groq API returns LLaMA-powered forensic explanation

---

## 2. Frontend Architecture

| Technology | Purpose |
|-----------|---------|
| **React** | Component-based UI with hooks for state management |
| **Vite** | Sub-100ms HMR, optimized production builds |
| **Vanilla CSS** | Custom design tokens, CSS variables, glassmorphism |
| **Lucide-React** | SVG icon library |

### Key Components

| Component | Lines | Responsibility |
|-----------|-------|----------------|
| `DetectPanel.jsx` | 29k | Core analysis interface — drag-and-drop, file queue, per-file analysis state, verdict display |
| `HeroSection.jsx` | 6k | Landing hero with animated gradient text and CTA |
| `Navbar.jsx` | 6.5k | Navigation with theme toggle |
| `HowItWorks.jsx` | 5k | Three-step explainer animation |
| `Modalities.jsx` | 5.3k | Image/Video/Audio capability cards |
| `Footer.jsx` | 6.4k | Links and branding |

### Design System
- **Dark mode default** with light mode toggle via `ThemeContext`
- **Glassmorphism**: `backdrop-filter: blur()` + semi-transparent backgrounds
- **Ambient effects**: `Particles.jsx` (floating dots) + `Grain.jsx` (film noise overlay)
- **Micro-animations**: Smooth transitions on hover, skeleton loaders during analysis

### State Management
```
DetectPanel maintains per-file state map:
  {fileId} → {status: 'pending'|'analyzing'|'complete', result: {...}, explanation: '...'}

Dual-phase rendering:
  Phase 1: Verdict + confidence rendered immediately from /detect endpoint
  Phase 2: Skeleton loader → LLaMA explanation hydrated from /detect/explain
```

---

## 3. Backend & API Pipeline

| Technology | Purpose |
|-----------|---------|
| **FastAPI** | Async REST framework with automatic OpenAPI docs |
| **Uvicorn** | ASGI server with worker threads |
| **Python 3.13** | Runtime |

### Endpoints

| Method | Path | Content Types | Size Limit | Description |
|--------|------|--------------|------------|-------------|
| `POST` | `/detect/image` | JPEG, PNG, WebP, GIF | 20 MB | Image deepfake detection |
| `POST` | `/detect/audio` | MP3, WAV, OGG, FLAC | 50 MB | Audio deepfake detection |
| `POST` | `/detect/video` | MP4, WebM, MKV, AVI | 500 MB | Video deepfake detection (15-frame sampling) |
| `POST` | `/detect/explain` | JSON body | — | LLaMA 3.3 forensic explanation |
| `GET`  | `/health` | — | — | Health check |

### Concurrency Model
```python
# Heavy AI inference runs in thread pool to avoid blocking the event loop
loop = asyncio.get_event_loop()
result = await loop.run_in_executor(None, classify_image, image_bytes)
```

### Model Loading Strategy
Models load **once at startup** via FastAPI's `lifespan` context manager:
```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    await loop.run_in_executor(None, load_image_models)   # ViT + SigLIP + RetinaFace
    await loop.run_in_executor(None, load_audio_model)     # Wav2Vec2
    yield
```

---

## 4. Image Detection Pipeline (v2.0)

The image pipeline is a **6-stage forensic analysis chain**:

```
Stage 1: Image Ingestion
    │  Raw bytes → PIL Image (RGB)
    ▼
Stage 2: Face Detection (RetinaFace)
    │  Two-pass: original → CLAHE-enhanced retry
    │  Output: face crop (224×224) + detected flag
    ▼
Stage 3: Skin-Tone Preprocessing (CLAHE)
    │  Adaptive contrast based on luminance estimation
    │  + White balance + Adaptive sharpening
    ▼
Stage 4: ViT Classification
    │  Face crop → ViTForImageClassification → P(fake)
    ▼
Stage 5: SigLIP Classification
    │  Full original image → SigLIP → P(fake)
    ▼
Stage 6: Smart Ensemble
    │  Face-detection-aware weighted merge
    │  Recalibrated thresholds → Verdict
    ▼
Output: {label, confidence, face_detected, ensemble_breakdown}
```

---

## 5. Face Detection — RetinaFace

**File:** `models/image/face_detector.py`

### Why RetinaFace over MTCNN
| Aspect | MTCNN (v1) | RetinaFace (v2) |
|--------|-----------|-----------------|
| Training data | VGGFace2/CASIA-WebFace (Western-dominated) | WIDER FACE (32k+ images, multi-ethnic) |
| Detection rate on Indian faces | ~70% | >95% |
| Architecture | 3-stage cascade (P-Net → R-Net → O-Net) | Single-stage with FPN |
| Landmarks | 5-point | 5-point (aligned) |
| Speed | ~15fps | ~25fps |

### Two-Pass Strategy
```python
def detect_face(pil_image):
    # Pass 1: Detection on original image
    face_crop, found = detect_and_crop_face(pil_image)
    if found: return face_crop, True

    # Pass 2: CLAHE-enhance → retry (helps dark skin under poor lighting)
    enhanced = preprocess_for_detection(pil_image)
    face_crop, found = detect_and_crop_face(enhanced)
    if found: return face_crop, True

    # Fallback: use full image (ViT weight reduced in ensemble)
    return pil_image, False
```

### Face Crop Parameters
- **Margin**: 15% on each side (captures jawline/hairline artifacts)
- **Output size**: 224×224 (ViT input size)
- **Interpolation**: Lanczos (highest quality downscaling)
- **Confidence threshold**: 0.5 (det_score)

### Graceful Fallback
If `insightface` is not installed, the system falls back to MTCNN (`facenet-pytorch`) with improved parameters (margin=40, min_face_size=40).

---

## 6. Skin-Tone-Aware Preprocessing

**File:** `models/image/preprocessing.py`

### Why This Matters
Deepfake artifacts (blending boundaries, GAN artifacts, frequency anomalies) exist on all faces, but they're **harder to detect on darker skin** because:
- JPEG compression removes more detail from melanin-rich regions
- Darker pixels have lower dynamic range (fewer gradient steps between values)
- Standard models are trained on lighter skin tones and learn texture patterns specific to those

### Pipeline

```
Input Face Crop (224×224)
    │
    ▼
Estimate Skin Tone (LAB luminance)
    │  avg_L > 170 → "light"
    │  avg_L > 120 → "medium"
    │  avg_L ≤ 120 → "dark"
    ▼
Adaptive CLAHE
    │  Light:  clip_limit=1.5, grid=8×8
    │  Medium: clip_limit=2.5, grid=8×8
    │  Dark:   clip_limit=3.5, grid=6×6  ← stronger enhancement, finer grid
    ▼
White Balance (Gray World Algorithm)
    │  Neutralizes color cast from lighting
    ▼
Adaptive Sharpening (medium/dark skin only)
    │  Unsharp mask, strength=0.25
    ▼
Output: Enhanced face crop for ViT
```

### Technical Details
- **CLAHE operates in LAB color space** — only the L (lightness) channel is equalized, preserving color information
- **Gray World assumption**: scales each BGR channel so average = neutral gray
- **Sharpening** uses Gaussian-based unsharp mask (σ=2.0), applied only to medium/dark skin to avoid amplifying noise on already well-lit faces

---

## 7. ViT — Vision Transformer Detector

**File:** `models/image/vit_detector.py`

### Architecture
```
ViTForImageClassification (ViT-Base/16)
├── Patch embedding: 16×16 patches → 768-dim tokens
├── 12 transformer encoder layers
│   ├── Multi-head self-attention (12 heads)
│   ├── MLP (768 → 3072 → 768)
│   └── Layer norm (ε=1e-12)
├── Pooler: [CLS] token → 768-dim
└── Classifier: 768 → 2 (Deepfake | Real)
```

### Why ViT for Deepfake Detection
- **Global attention**: Unlike CNNs that analyze local patches, ViT tracks relationships across the **entire** face simultaneously — critical for catching inconsistent lighting gradients and impossible shadow patterns
- **Patch-level analysis**: 16×16 patch tokenization naturally segments the face into ~196 regions, each of which gets cross-attention with all others
- **Frequency sensitivity**: ViT's attention mechanism captures high-frequency GAN artifacts that CNN pooling layers often miss

### Weight Loading Priority
```python
1. Local finetuned weights: models/weights/finetuned-vit/  ← checked first
2. HuggingFace Hub fallback: dima806/deepfake_vs_real_image_detection
```

### Finetuning Details
- **Base model**: `prithivMLmods/Deepfake-Detection-Exp-02-21`
- **Training data**: 6,000 images (3,000 real + 3,000 fake)
  - FairFace: 2,000 images (Indian/SE Asian/Middle Eastern prioritized)
  - 140k dataset: 1,500 real + 3,000 fake
- **Key hyperparameters**: lr=1.5e-5, batch=8, grad_accum=4, epochs=5, fp16
- **Real class weight**: 3.0× (prioritizes reducing false positives)
- **Output**: `model.safetensors` (343 MB)

---

## 8. SigLIP — Scene-Level Detector

**File:** `models/image/siglip_detector.py`

### Purpose
While ViT analyzes the **face**, SigLIP examines the **entire scene** for artifacts from fully-generative tools (Midjourney, DALL-E, Stable Diffusion).

### What SigLIP Catches That ViT Misses
- Images with no faces (landscapes, objects)
- Fully synthetic images where the face looks perfect but the background has impossible physics
- Lighting inconsistencies between the subject and the scene
- Depth-of-field errors characteristic of diffusion models

### Architecture
- **Model**: `prithivMLmods/deepfake-detector-model-v1`
- **Input**: Full original image (not cropped)
- **Output**: P(fake) — probability the image is synthetic

---

## 9. Ensemble Logic (v2.0)

**File:** `models/image/ensemble.py`

### Decision Logic

```python
if face_detected:
    if vit_fake >= 0.72:       # ViT high-confidence override
        score = vit_fake
    elif siglip_fake >= 0.70:  # SigLIP high-confidence override
        score = siglip_fake
    else:                      # Weighted blend
        score = 0.60 * vit_fake + 0.40 * siglip_fake

else:  # No face detected — ViT is unreliable on full scenes
    if siglip_fake >= 0.70:    # SigLIP takes the lead
        score = siglip_fake
    elif vit_fake >= 0.80:     # ViT needs much higher bar without a face
        score = vit_fake
    else:
        score = 0.35 * vit_fake + 0.65 * siglip_fake

# Verdict thresholds
if score >= 0.68: label = "fake"
elif score <= 0.42: label = "real"
else: label = "uncertain"
```

### v1 → v2 Changes
| Parameter | v1 | v2 | Rationale |
|-----------|----|----|-----------|
| ViT override threshold | 0.65 | **0.72** | Reduce false positives on Indian faces |
| SigLIP override threshold | 0.70 | 0.70 | Scene detection is less skin-dependent |
| No-face ViT override | 0.65 | **0.80** | ViT on full scenes is unreliable |
| No-face weights | 50/50 | **35/65** | Heavily favor SigLIP without a face |
| Fake threshold | 0.65 | **0.68** | More conservative "fake" classification |
| Real threshold | 0.35 | **0.42** | Wider "uncertain" band reduces misclassifications |

---

## 10. Audio Detection Pipeline

**File:** `models/audio/audio_detector.py`

| Component | Detail |
|-----------|--------|
| Model | `wav2vec2-deepfake-voice-detector` |
| Architecture | Wav2Vec2ForAudioClassification |
| Input | Audio waveform (mono, 16kHz) |
| Max Duration | 30 seconds |
| Output | P(real), P(fake) |
| Library | `librosa` for audio loading |

### Processing
```python
audio_array, sr = librosa.load(audio_bytes, sr=16000, mono=True)
# Truncate to 30s → Wav2Vec2 feature extraction → softmax → verdict
```

---

## 11. Video Detection Pipeline

**Files:** `models/video/frame_extractor.py`, `models/video/video_utils.py`

### Strategy
Instead of analyzing every frame (computationally infeasible), we sample **15 frames** uniformly across the video's duration using `numpy.linspace`:

```python
indices = np.linspace(0, total_frames - 1, 15, dtype=int)
```

Each frame is converted to JPEG bytes and run through the full **image detection pipeline** (RetinaFace → CLAHE → ViT → SigLIP → ensemble).

### Aggregation
Frame results are aggregated into a video-level verdict:
- **Fake ratio**: % of frames classified as fake
- **Average fake score**: Mean ensemble score across all frames
- **Overall verdict**: Based on fake ratio thresholds

---

## 12. Explainable AI (LLaMA 3.3)

**Files:** `ai_service/groq_service.py`, `ai_service/prompts.py`

### Why LLaMA 3.3 70B
- **70B parameters** = nuanced understanding of forensic terminology
- **Groq API** = LPU inference at ~300 tokens/sec (sub-second response times)
- **Temperature 0.4** = mostly factual, slight variation for readability

### Prompt Engineering
Each media type has a specialized prompt template that includes:
- Raw verdict and confidence
- Per-model probability breakdown
- Instructions to explain in 2-3 sentences for non-technical users

Example for images:
```
You are a deepfake detection expert. An AI ensemble analyzed an image.
Result: FAKE (87.3% confidence)
ViT model fake probability: 0.8934
SigLIP model fake probability: 0.6421

Write 2-3 sentences explaining this result to a non-technical user.
```

---

## 13. Diversity & Bias Mitigation

### Root Cause Analysis

| Layer | Problem | v2 Solution |
|-------|---------|------------|
| Face Detection | MTCNN trained on VGGFace2 (Western) — fails on Indian faces ~30% | RetinaFace (WIDER FACE, 32k+ diverse faces) + two-pass with CLAHE |
| Preprocessing | No skin-tone normalization — darker skin has less visible texture | Adaptive CLAHE with stronger enhancement for darker skin |
| ViT Weights | Trained on biased dataset — learns "Indian skin texture = suspicious" | Finetuned on FairFace with Indian/SE Asian/ME faces prioritized |
| Ensemble | Aggressive thresholds cause false positives | Recalibrated using per-ethnicity evaluation data |
| Evaluation | No demographic breakdowns — bias invisible | Per-ethnicity accuracy table via eval_diversity.py |

### CLAHE — The Key Innovation

CLAHE (Contrast Limited Adaptive Histogram Equalization) is the linchpin of our bias mitigation:

1. **Divides the image into tiles** (e.g., 6×6 or 8×8 grid)
2. **Equalizes histogram within each tile** independently
3. **Clips the histogram** to prevent over-amplification of noise
4. **Bilinearly interpolates** between tile boundaries to avoid block artifacts

For darker skin, we use **clip_limit=3.5** with a **finer grid (6×6)** to reveal micro-textures that are otherwise invisible to the model.

---

## 14. Finetuning Pipeline

**File:** `scripts/finetune.py`

### Training Configuration

```python
BATCH_SIZE          = 8        # RTX 3050 (4GB VRAM)
GRAD_ACCUM_STEPS    = 4        # Effective batch = 32
LEARNING_RATE       = 1.5e-5   # Conservative for finetuning
EPOCHS              = 5
FP16                = True     # Half-precision for memory efficiency
REAL_CLASS_WEIGHT   = 3.0      # Penalize false positives on real faces 3×
SEED                = 42
```

### Data Curation Strategy
```
Real faces (target: 3000):
├── FairFace (2000) — Indian/SE Asian/Middle Eastern prioritized via CSV labels
├── 140k real (1500) — general diverse faces
└── Indian custom (optional) — user-provided

Fake faces (target: 3000):
├── 140k fake (3000) — GAN-generated faces
└── Indian fake (optional) — user-provided
```

### Augmentation
Skin-tone-aware augmentation during training:
- **Color jitter** (brightness ±30%, contrast ±30%, saturation ±20%) — simulates varied lighting
- **Random horizontal flip** (50%)
- **Gaussian blur** (15%, σ=0.5) — simulates phone camera / WhatsApp compression

### Custom Trainer
`WeightedTrainer` overrides the loss function to apply `REAL_CLASS_WEIGHT = 3.0` to real faces, making false positives 3× more costly than false negatives.

---

## 15. Evaluation Pipeline

**File:** `scripts/eval_diversity.py`

Produces a per-demographic accuracy table:
```
Group                         N   Acc     FPR     FNR   Face%
Indian (real)                50  92.0%   4.0%    —     96.0%
White (real)                 50  94.0%   2.0%    —     98.0%
East Asian (real)            50  90.0%   6.0%    —     94.0%
Black (real)                 50  91.0%   5.0%    —     95.0%
Generic Fakes                50  88.0%    —     8.0%   82.0%
```

### Metrics
- **FPR (False Positive Rate)**: Real images wrongly called fake (LOWER is better)
- **FNR (False Negative Rate)**: Fake images wrongly called real (LOWER is better)
- **Face%**: Face detection success rate per demographic

---

## 16. Deployment & Hardware

### Supported Hardware
| Device | Mode | Performance |
|--------|------|------------|
| NVIDIA RTX 3050 (4GB) | CUDA fp16 | ~1.2 images/sec |
| NVIDIA RTX 3060+ (6GB+) | CUDA fp16 | ~2-4 images/sec |
| Apple M1/M2 | MPS | ~0.8 images/sec |
| CPU only | fp32 | ~0.2 images/sec |

### Memory Optimization
- **fp16** inference and training
- **Gradient accumulation** (batch 8 × 4 = effective 32)
- **RetinaFace buffalo_sc** (lightweight model variant)
- **Thread pool executor** prevents AI inference from blocking the async event loop

### Docker
```yaml
# docker-compose.yml available in project root
docker-compose up --build
```

### Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | Yes | Groq API key for LLaMA 3.3 70B inference |
| `PYTHONPATH` | For scripts | Set to `.` when running scripts from project root |
