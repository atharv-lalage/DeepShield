"""
Project Xero PICT — Finetune Script (Hackathon Edition)
========================================================
Dataset sources:
  Real → data/raw/fake140k/real_vs_fake/real-vs-fake/train/real/  (1500 images)
       + data/raw/fairface/train/                                  (1500 images)
  Fake → data/raw/fake140k/real_vs_fake/real-vs-fake/train/fake/  (3000 images)
  ─────────────────────────────────────────────────────────────────
  Total: 3000 real + 3000 fake = 6000 images

Output: ./models/weights/finetuned-vit

Usage:
  source venv/bin/activate
  PYTHONPATH=. python scripts/finetune.py
"""

import random
import sys
from pathlib import Path

import torch
from PIL import Image
from torch.nn import CrossEntropyLoss
from torch.utils.data import Dataset
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    Trainer,
    TrainingArguments,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT  = Path(__file__).parent.parent
REAL_140K     = PROJECT_ROOT / "data/raw/fake140k/real_vs_fake/real-vs-fake/train/real"
FAKE_140K     = PROJECT_ROOT / "data/raw/fake140k/real_vs_fake/real-vs-fake/train/fake"
FAIRFACE_REAL = PROJECT_ROOT / "data/raw/fairface/train"
OUTPUT_DIR    = PROJECT_ROOT / "models/weights/finetuned-vit"
BASE_MODEL    = "prithivMLmods/Deepfake-Detection-Exp-02-21"

# ── Config ────────────────────────────────────────────────────────────────────
REAL_140K_LIMIT   = 1500
FAIRFACE_LIMIT    = 1500
FAKE_LIMIT        = 3000
VAL_SPLIT         = 0.15
EPOCHS            = 3
BATCH_SIZE        = 16
LEARNING_RATE     = 2e-5
REAL_CLASS_WEIGHT = 2.5
SEED              = 42

random.seed(SEED)

# Label mapping — must match config.json: {0: Deepfake, 1: Real}
LABEL2ID = {"Deepfake": 0, "Real": 1}
ID2LABEL = {0: "Deepfake", 1: "Real"}

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def collect_images(folder: Path, limit: int, label: str) -> list[Path]:
    if not folder.exists():
        print(f"[ERROR] Folder not found: {folder}")
        sys.exit(1)
    imgs = [p for p in folder.iterdir() if p.suffix.lower() in IMG_EXTS]
    random.shuffle(imgs)
    imgs = imgs[:limit]
    print(f"[data] {label:<30} → {len(imgs)} images from {folder.relative_to(PROJECT_ROOT)}")
    return imgs


# ─────────────────────────────────────────────────────────────────────────────
# Dataset
# ─────────────────────────────────────────────────────────────────────────────
class DeepfakeDataset(Dataset):
    def __init__(self, samples: list[tuple[Path, int]], processor):
        self.samples   = samples
        self.processor = processor

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            image = Image.open(path).convert("RGB")
        except Exception:
            image = Image.new("RGB", (224, 224), (128, 128, 128))
        pixel_values = self.processor(
            images=image, return_tensors="pt"
        )["pixel_values"].squeeze(0)
        return {"pixel_values": pixel_values, "labels": torch.tensor(label)}


# ─────────────────────────────────────────────────────────────────────────────
# Weighted Trainer
# ─────────────────────────────────────────────────────────────────────────────
class WeightedTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kwargs):
        labels  = inputs.pop("labels")
        outputs = model(**inputs)
        logits  = outputs.logits
        weights = torch.ones(len(LABEL2ID), device=logits.device)
        weights[LABEL2ID["Real"]] = REAL_CLASS_WEIGHT
        loss = CrossEntropyLoss(weight=weights)(logits, labels)
        return (loss, outputs) if return_outputs else loss


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("\n" + "="*60)
    print("  PROJECT XERO PICT — Finetuning ViT")
    print("="*60)

    # 1. Collect images
    print("\n[data] Collecting images...")
    real_paths = (
        collect_images(REAL_140K,     REAL_140K_LIMIT, "140k real faces") +
        collect_images(FAIRFACE_REAL, FAIRFACE_LIMIT,  "FairFace real faces")
    )
    fake_paths = collect_images(FAKE_140K, FAKE_LIMIT, "140k fake faces")

    # Balance
    min_count  = min(len(real_paths), len(fake_paths))
    real_paths = random.sample(real_paths, min_count)
    fake_paths = random.sample(fake_paths, min_count)
    print(f"\n[data] Balanced → {min_count} real + {min_count} fake = {min_count*2} total")

    # Build samples
    all_samples = (
        [(p, LABEL2ID["Real"])     for p in real_paths] +
        [(p, LABEL2ID["Deepfake"]) for p in fake_paths]
    )
    random.shuffle(all_samples)

    # Train/val split
    split      = int(len(all_samples) * (1 - VAL_SPLIT))
    train_data = all_samples[:split]
    val_data   = all_samples[split:]
    print(f"[data] Train: {len(train_data)}  Val: {len(val_data)}")

    # 2. Load model
    print(f"\n[model] Loading: {BASE_MODEL}")
    processor = AutoImageProcessor.from_pretrained(BASE_MODEL)
    model     = AutoModelForImageClassification.from_pretrained(
        BASE_MODEL,
        num_labels=2,
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        ignore_mismatched_sizes=True,
    )

    # 3. Datasets
    train_ds = DeepfakeDataset(train_data, processor)
    val_ds   = DeepfakeDataset(val_data,   processor)

    # 4. Training args
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    use_mps = torch.backends.mps.is_available()
    print(f"[train] Device: {'MPS (Apple Silicon)' if use_mps else 'CPU'}")

    args = TrainingArguments(
        output_dir                  = str(OUTPUT_DIR),
        num_train_epochs            = EPOCHS,
        per_device_train_batch_size = BATCH_SIZE,
        per_device_eval_batch_size  = BATCH_SIZE,
        learning_rate               = LEARNING_RATE,
        warmup_ratio                = 0.1,
        weight_decay                = 0.01,
        eval_strategy               = "epoch",
        save_strategy               = "epoch",
        load_best_model_at_end      = True,
        metric_for_best_model       = "eval_loss",
        logging_steps               = 50,
        dataloader_num_workers      = 0,
        fp16                        = False,

        report_to                   = "none",
        save_total_limit            = 1,
    )

    # 5. Train
    print(f"\n[train] Starting — {EPOCHS} epochs over {len(train_data)} samples")
    print("[train] Estimated time: 90–120 min on Apple Silicon\n")

    trainer = WeightedTrainer(
        model         = model,
        args          = args,
        train_dataset = train_ds,
        eval_dataset  = val_ds,
    )
    trainer.train()

    # 6. Save
    print(f"\n[save] Saving to {OUTPUT_DIR} ...")
    trainer.save_model(str(OUTPUT_DIR))
    processor.save_pretrained(str(OUTPUT_DIR))

    print("\n" + "="*60)
    print("  ✅ Finetuning complete!")
    print(f"  Weights saved to: {OUTPUT_DIR}")
    print("\n  Restart backend to load new weights:")
    print("  PYTHONPATH=. python -m uvicorn backend.main:app --reload")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()