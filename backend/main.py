import os
from dotenv import load_dotenv

# Load environment variables before anything else starts
load_dotenv()

import asyncio
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Make sure models/ is importable from backend/
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from models.image.ensemble import load_models as load_image_models
from models.audio.audio_detector import load_audio_model
from backend.app.api.routes import router


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan — load all models once at startup
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[main] Loading all models — this may take a minute on first run...")
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, load_image_models)
    await loop.run_in_executor(None, load_audio_model)
    print("[main] All models loaded. Ready.")
    yield
    print("[main] Shutting down.")


app = FastAPI(
    title="Project Xero PICT — Deepfake Detector",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
def root():
    return {"status": "ok", "service": "project-xero-pict"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
    