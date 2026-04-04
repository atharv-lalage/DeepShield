# Project Xero PICT - Technologies & Architecture Stack

Welcome to the technical overview of **Project Xero PICT**, an advanced, ensemble-driven deepfake detection system. This document outlines the distinct layers of our architecture, the specific tools relied upon, and how the core AI models interact to deliver high-confidence authenticity reports with extremely low latency.

---

## 🎨 Frontend Architecture

The frontend is built for absolute responsiveness, featuring a futuristic "glassmorphism" UI design capable of handling parallel multi-file uploads and decoupled asynchronous analysis rendering.

- **Core Framework**: React (bootstrapped with Vite for instant HMR and optimized builds)
- **Styling**: Contextual Vanilla CSS featuring custom CSS variables, dark/light theme switching, smooth bezier transitions, and dynamic SVG `clip-path` animations.
- **Icons**: [Lucide-React](https://lucide.dev/) for crisp, scalable, and customizable vector icons.
- **State Management**: React Hooks (`useState`, `useEffect`, `useCallback`) ensuring fluid DOM updates, particularly for tracking independent "Analyzing", "Pending", and "Complete" states iteratively across multi-file queues.
- **Performance Optimizations**: 
  - Dual-phase rendering: Technical analysis metrics (verdict & confidence) hydrate instantly, while a skeleton loader bridges the gap for the async Groq LLM explanation.
  - Granular State Immutability: Deep-copy React state clones ensure `DetectPanel` maps are actively evaluated in memory for immediate UI refreshes.

---

## ⚙️ Backend & API Pipeline

The backend functions as the high-throughput bridge connecting the frontend payload to raw tensor analytics and LLM generation. 

- **Framework**: **FastAPI** (Python 3)
- **Server Environment**: Asynchronous ASGI handling via **Uvicorn**
- **Concurrency Setup**: Route handlers split AI detection paths (image/video/audio) using `asyncio`-driven `run_in_executor` threads to heavily minimize blocking while large neural network architectures iterate.
- **API Design**:
  - `/detect/image`, `/detect/video`, `/detect/audio`: Rapid ingestion paths optimized entirely for numerical anomaly detection.
  - `/detect/explain`: Dedicated stateless ingestion endpoint interacting rapidly with Groq to fetch LLM summaries. 

---

## 🧠 AI Models & Deepfake Detection Engine

The detection architecture takes a specialized "Ensemble" approach, meaning we process media simultaneously through different mathematical models specialized in targeting contrasting types of manipulation.

### 1. MTCNN (Multi-task Cascaded Convolutional Networks)
- **Purpose**: High-precision Facial Cropping & Bounding Box extraction.
- **Implementation**: We utilize [facenet-pytorch](https://github.com/timesler/facenet-pytorch). By passing images through MTCNN first, we crop strictly bounding the target jawline, hairline, and facial boundaries—historically the weakest linking points in traditional FaceSwap/Deepfake methodologies.

### 2. Vision Transformer (ViT)
- **Purpose**: The "Forensic Face Detective". 
- **Implementation**: ViT acts as our primary classification engine on the facial crop. Because transformers track pixel attention across an image holistically rather than locally (like CNNs), they catch hidden manipulation layers, artificial noise gradients, and frequency-domain errors. 

### 3. SigLIP (Sigmoid Loss for Language Image Pre-Training)
- **Purpose**: The "Scene-level Background Detective".
- **Implementation**: Instead of examining just the face, SigLIP grades the complete unstructured surrounding space. This specifically targets 100% generative AI structures (e.g., Midjourney, DALL-E) that lack distinct "faces" but still consist of computationally hallucinated artifacts, lighting inconsistencies, and depth errors.

### 4. Mathematical Override Logic
- The Ensemble bridges ViT and SigLIP logically. If ViT confidence spikes `≥ 65%` it overrides entirely (definite Face Swap). If SigLIP reaches `≥ 70%` it overrides (definite Generative Scene). Otherwise, it blends predictions logically (60% ViT | 40% SigLIP).

---

## 💬 Generative AI Analysis

- **Model**: **LLaMA 3.3 70B**
- **Infrastructural Provider**: **Groq API**
- **Implementation**: Provides an intelligent translation layer. Once the ensemble calculates percentage scores and identifies synthetic regions, this data is secretly payloaded into LLaMA. LLaMA then outputs a readable, human-friendly explanation of exactly *why* the data looks suspicious, returned rapidly thanks to Groq's specialized LPU infrastructure. 

---

## 📦 Runtime Environment
- **Python**: Primary backend infrastructure and heavy computation (PyTorch natively).
- **Node.js**: Frontend build tooling and runtime serving.
- **Hardware Integration**: Supports fallback computing. Tensors detect `cuda` automatically if dedicated Nvidia GPU hardware is available, checking `mps` on Apple Silicon natively, and defaulting gracefully to `cpu` when necessary.
