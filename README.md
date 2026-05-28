# DeepShield 🛡️ — AI-Powered Deepfake Detection System

> Multi-modal deepfake detection with an ensemble AI architecture, Explainable AI forensic reports, and a diversity-aware pipeline that reduces demographic bias across skin tones.

[![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python)](https://python.org)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.6-red?logo=pytorch)](https://pytorch.org)
[![React](https://img.shields.io/badge/React-Vite-purple?logo=react)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-green?logo=fastapi)](https://fastapi.tiangolo.com)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## 🎯 What is DeepShield?

**DeepShield** is a state-of-the-art forensic AI system that detects manipulated media — images, videos, and audio — in real time. It doesn't just give you a verdict; it explains *exactly why* media is fake using LLaMA 3.3 70B-powered natural language analysis.

**v2.0** introduces a **diversity-aware detection pipeline** — a multi-layer system tackling a critical gap in AI: demographic bias. Most deepfake detectors are trained on Western-dominated datasets, causing high false-positive rates on Indian and South Asian faces. DeepShield v2.0 solves this with RetinaFace, CLAHE preprocessing, and ViT model finetuning on diverse demographic data.

---

## 🔥 Key Features

| Feature | Description |
|---------|-------------|
| **Multi-Modal Detection** | Analyze images, videos (frame-by-frame), and audio files — all from one interface |
| **Ensemble Architecture** | Two neural networks (ViT + SigLIP) target different manipulation types simultaneously |
| **Diversity-Aware Pipeline** | RetinaFace + CLAHE preprocessing + finetuned weights reduce false positives on Indian/South Asian faces by 40%+ |
| **Two-Pass Face Detection** | If face detection fails (common with darker skin under poor lighting), the image is CLAHE-enhanced and retried |
| **Explainable AI (XAI)** | LLaMA 3.3 70B generates human-readable forensic explanations of why media is classified as fake |
| **Visual Forensic Breakdown** | Full ensemble confidence breakdown showing each model's individual prediction |
| **Glassmorphic UI** | Premium dark-themed React frontend with drag-and-drop, ambient particles, and micro-animations |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + Vite)                   │
│   Drag-and-drop upload → Live analysis → Forensic report        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (FastAPI)
┌───────────────────────────▼─────────────────────────────────────┐
│                     Backend (FastAPI + Uvicorn)                   │
│                                                                  │
│  /detect/image ──► Image Pipeline                                │
│  /detect/video ──► Frame Extraction → Image Pipeline × 15        │
│  /detect/audio ──► Wav2Vec2 Audio Classifier                     │
│  /detect/explain → Groq API → LLaMA 3.3 70B                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│               Image Detection Pipeline (v2.0)                    │
│                                                                  │
│  Input Image                                                     │
│      │                                                           │
│      ▼                                                           │
│  RetinaFace (WIDER FACE, 32k+ diverse faces)                     │
│  + Two-pass: retry with CLAHE boost if first pass fails          │
│      │                                                           │
│      ├──► CLAHE Preprocessed Face ──► ViT (finetuned, 94% prec) │
│      │                                                           │
│      └──► Original Full Image ──► SigLIP (scene artifacts)       │
│                                                                  │
│  Smart Ensemble (face-detection-aware, recalibrated thresholds)  │
│      │                                                           │
│      ▼                                                           │
│  Verdict: FAKE / REAL / UNCERTAIN + confidence + breakdown       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🧠 AI Models

| Model | Role | Architecture | Training Data |
|-------|------|-------------|---------------|
| **ViT** (Vision Transformer) | Face forensics — detects manipulation artifacts on facial crops | `ViTForImageClassification` (768-dim, 12 layers, 86M params) | Finetuned on FairFace (86k diverse faces) + 140k Real/Fake + Indian faces |
| **SigLIP** | Scene forensics — detects fully synthetic images (Midjourney, DALL-E) | `prithivMLmods/deepfake-detector-model-v1` | HuggingFace pretrained |
| **RetinaFace** | Face detection — locates faces across all skin tones | `insightface/buffalo_sc` | WIDER FACE (32k+ diverse images) |
| **Wav2Vec2** | Audio deepfake detection — identifies synthetic speech | `garystafford/wav2vec2-deepfake-voice-detector` | HuggingFace pretrained |
| **LLaMA 3.3 70B** | Explainable AI — generates forensic reports | Via Groq API (LPU inference) | Meta's training corpus |

---

## 🌍 Diversity & Bias Mitigation (v2.0)

### The Problem
Most deepfake detectors fail on non-Western faces because they're trained on Western-dominated datasets:
- **MTCNN** fails to detect Indian faces ~30% of the time
- Real Indian faces classified as "fake" due to training bias
- No evaluation metrics broken down by demographics

### Our Solution — A Multi-Layer Approach

| Layer | Technique | Impact |
|-------|-----------|--------|
| **Face Detection** | RetinaFace (WIDER FACE, 32k+ diverse images) replaces MTCNN | >95% detection rate across all skin tones |
| **Two-Pass Detection** | CLAHE-enhanced retry when first detection pass fails | Catches faces under poor lighting |
| **Preprocessing** | Skin-tone-adaptive CLAHE, white balance, adaptive sharpening | Equalizes micro-texture visibility across skin tones |
| **Finetuning** | ViT finetuned on Indian-prioritized FairFace + 140k dataset | Reduces false positives on diverse real faces |
| **Thresholds** | Ensemble override thresholds recalibrated using per-ethnicity metrics | ViT override: 0.65→0.72, Verdict: 0.65→0.68 |
| **Evaluation** | Per-demographic accuracy table via `eval_diversity.py` | Transparent bias auditing |

### Training Results

| Metric | Value |
|--------|-------|
| **False Positive Rate** | **3.27%** (real faces wrongly called fake) |
| **Fake Precision** | **94.36%** (when it says fake, it's right) |
| **Overall Accuracy** | **77.22%** |
| **Training Time** | 13 minutes on RTX 3050 (4GB VRAM) |

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+
- NVIDIA GPU (recommended) or CPU
- Groq API key ([get one free](https://console.groq.com))

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Project-Xero-PICT.git
cd Project-Xero-PICT
```

### 2. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate           # Windows
pip install -r requirements.txt
pip install insightface onnxruntime   # For RetinaFace face detection
```

Create a `.env` file in the project root:
```env
GROQ_API_KEY="your_groq_api_key_here"
```

Start the server:
```bash
python main.py
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173/` — drag and drop media files to analyze!

### 4. (Optional) Finetune for Diversity
```bash
# Install dependencies
pip install datasets accelerate

# Download diverse training data (FairFace + Real/Fake faces)
set PYTHONPATH=.
python scripts/download_datasets.py

# Finetune ViT model (~13 min on RTX 3050)
python scripts/finetune.py

# Restart backend to load new weights
cd backend && python main.py
```

---

## 📂 Project Structure

```
Project-Xero-PICT/
├── frontend/                    # React + Vite UI
│   └── src/
│       ├── components/          # DetectPanel, HeroSection, Navbar, etc.
│       ├── effects/             # Particles, Grain (ambient visuals)
│       ├── context/             # ThemeProvider (dark/light mode)
│       └── services/            # API client
│
├── backend/                     # FastAPI server
│   ├── main.py                  # Entrypoint — loads all models at startup
│   └── app/api/routes.py        # /detect/image, /detect/audio, /detect/video, /detect/explain
│
├── models/
│   ├── image/
│   │   ├── ensemble.py          # Smart ensemble (v2.0 — diversity-aware)
│   │   ├── vit_detector.py      # ViT classifier (auto-loads finetuned weights)
│   │   ├── siglip_detector.py   # SigLIP scene-level classifier
│   │   ├── face_detector.py     # RetinaFace with MTCNN fallback
│   │   └── preprocessing.py     # CLAHE, white balance, adaptive sharpening
│   ├── audio/
│   │   └── audio_detector.py    # Wav2Vec2 audio classifier
│   ├── video/
│   │   ├── frame_extractor.py   # Extract 15 key frames from video
│   │   └── video_utils.py       # Aggregate frame results
│   └── weights/
│       └── finetuned-vit/       # Finetuned ViT weights (343MB)
│
├── ai_service/
│   ├── groq_service.py          # Groq API client (LLaMA 3.3 70B)
│   └── prompts.py               # Prompt templates for XAI explanations
│
├── scripts/
│   ├── download_datasets.py     # Automated dataset download from HuggingFace
│   ├── finetune.py              # Diversity-aware ViT finetuning pipeline
│   └── eval_diversity.py        # Per-ethnicity evaluation metrics
│
└── data/                        # Training datasets (gitignored)
    ├── raw/fairface/            # 86k diverse faces with ethnicity labels
    └── raw/fake140k/            # Real vs fake face images
```

---

## 👨‍💻 Team

Built during the **PVG Hackathon** by:

| Name | Role |
|------|------|
| **Samarth Raut** | Team Lead |
| **Atharv Lalage** | ML Pipeline & Backend |
| **Suyash Pathade** | Frontend & UI |
| **Shweta Rupnawar** | Research & Testing |

---

*Built with ❤️ for the future of digital trust and media authenticity.*
