# DeepShield (Project Xero PICT) 🛡️

**DeepShield** is a state-of-the-art forensic AI tool designed to detect digital manipulations, face swaps, and synthetic media. Built for high performance, it processes images, videos, and audio to deliver instant authenticity verdicts. DeepShield not only catches deepfakes—it explains *exactly* why they are fake using generative AI analysis.

---

## 🔥 Key Features

- **Multi-Modal Detection:** Instantly analyze images, videos, and audio files.
- **Ensemble AI Architecture:** Uses multiple neural networks concurrently to target contrasting types of generative manipulations.
- **Visual Forensic Heatmaps:** Pinpoints the exact `[X, Y]` coordinates of synthetic artifacts and gradients directly on an interactive UI overlay.
- **Explainable AI (XAI):** Rather than just outputting a percentage, it parses technical tensor outputs through **LLaMA 3.3 70B** to generate a readable forensic report for the user.
- **Glassmorphic UI:** A beautifully designed frontend tailored for intuitive drag-and-drop batch processing.

---

## 🛠️ Technology Stack

For deep engineering details and structural workflows, please refer to the specific [`TECH_STACK.md`](./TECH_STACK.md) document.

### Frontend
- **React.js + Vite:** For an insanely fast development environment and optimized production builds.
- **Vanilla CSS:** Custom semantic design tokens, complex gradient animations, and glassmorphism styling.
- **Lucide-React:** Precision vector iconography.

### Backend Pipeline
- **FastAPI / Uvicorn (Python):** Handling asynchronous, threaded AI tasks to decouple heavy calculations from UI rendering.
- **PyTorch:** The native deep learning engine executing forward passes.
- **Groq API:** Driving massive low-latency LLaMA inference.

### Core Neural Network Logic
- **MTCNN**: Specifically targets exact facial region bounding boxes.
- **Vision Transformer (ViT)**: The primary semantic network looking for localized generative face manipulations.
- **SigLIP**: The scene-level background network targeting purely synthetic (Midjourney/DALL-E) artifacts.

---

## 🚀 Getting Started

To run DeepShield locally, follow these steps:

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/Project-Xero-PICT.git
cd Project-Xero-PICT
```

### 2. Backend Setup
Navigate into the backend directory and set up the Python environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
```
Make sure to configure your environmental variables:
Create a `.env` file in the `backend` folder and add your Groq API key:
```env
GROQ_API_KEY="your_groq_api_key_here"
```

Start the FastAPI server:
```bash
uvicorn app.main:app --reload --port 8000
# Alternatively: python main.py
```

### 3. Frontend Setup
Open a new terminal tab, navigate to the frontend directory, and start the Vite dev server:
```bash
cd frontend
npm install
npm run dev
```

The UI should now be running at `http://localhost:5173/` by default. Drop an image in and let the engine scan!

---

## 👨‍💻 Team Members

Built during the PVG Hackathon by an amazing engineering team:

1. **Samarth Raut**
2. **Atharv Lalage**
3. **Suyash Pathade**
4. **Shweta Rupnawar**

---

*Made with ❤️ for the future of digital trust and media authenticity.*
