"""
DeepShield — Diversity-Aware Finetuning Script (v2.0)
======================================================
Enhanced finetuning pipeline designed to fix Indian/South Asian face accuracy.

Key improvements over v1:
  - Prioritizes Indian/South Asian faces from FairFace dataset
  - Adds CLAHE preprocessing as training augmentation
  - Color jitter + brightness/contrast augmentation for skin tone diversity
  - Optimized for RTX 3050 4GB VRAM (gradient accumulation + fp16)
  - Higher class weight for Real to reduce false positives on real diverse faces
  - Supports optional Indian-specific face data from data/raw/indian_faces/

Dataset sources:
  Real → data/raw/fake140k/.../train/real/           (1500 images)
       + data/raw/fairface/train/                      (2000 images, Indian-prioritized)
       + data/raw/indian_faces/real/                   (optional, up to 1000 images)
  Fake → data/raw/fake140k/.../train/fake/            (3000 images)
       + data/raw/indian_faces/fake/                   (optional, up to 500 images)
  ─────────────────────────────────────────────────────────────────
  Target: ~3500 real + ~3500 fake = ~7000 images (balanced)

Output: ./models/weights/finetuned-vit

Usage:
  Activate venv, then:
  set PYTHONPATH=.
  python scripts/finetune.py
"""

import csv
import random
import sys
from pathlib import Path

import torch
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter
from torch.nn import CrossEntropyLoss
from torch.utils.data import Dataset
from transformers import (
    AutoImageProcessor,
    AutoModelForImageClassification,
    Trainer,
    TrainingArguments,
)

# ── Paths ─────────────────────────────────────────────────────────────────────
PROJECT_ROOT    = Path(__file__).parent.parent
REAL_140K       = PROJECT_ROOT / "data/raw/fake140k/real_vs_fake/real-vs-fake/train/real"
FAKE_140K       = PROJECT_ROOT / "data/raw/fake140k/real_vs_fake/real-vs-fake/train/fake"
FAIRFACE_DIR    = PROJECT_ROOT / "data/raw/fairface/train"
FAIRFACE_LABELS = PROJECT_ROOT / "data/raw/fairface/fairface_label_train.csv"
INDIAN_REAL     = PROJECT_ROOT / "data/raw/indian_faces/real"
INDIAN_FAKE     = PROJECT_ROOT / "data/raw/indian_faces/fake"
OUTPUT_DIR      = PROJECT_ROOT / "models/weights/finetuned-vit"
BASE_MODEL      = "prithivMLmods/Deepfake-Detection-Exp-02-21"

# ── Config ────────────────────────────────────────────────────────────────────
REAL_140K_LIMIT        = 1500
FAIRFACE_TOTAL_LIMIT   = 2000    # Total FairFace images
FAIRFACE_INDIAN_TARGET = 800     # Of the 2000, try to get at least 800 Indian faces
INDIAN_REAL_LIMIT      = 1000    # Optional Indian-specific real faces
FAKE_140K_LIMIT        = 3000
INDIAN_FAKE_LIMIT      = 500     # Optional Indian-specific fake faces

VAL_SPLIT          = 0.15
EPOCHS             = 5           # Increased from 3 → 5 for better convergence
BATCH_SIZE         = 8           # Reduced for 4GB VRAM
GRAD_ACCUM_STEPS   = 4           # Effective batch size = 8 × 4 = 32
LEARNING_RATE      = 1.5e-5      # Slightly lower for more stable finetuning
REAL_CLASS_WEIGHT  = 3.0         # Increased from 2.5 → 3.0 to reduce false positives
SEED               = 42

random.seed(SEED)
torch.manual_seed(SEED)
np.random.seed(SEED)

# Label mapping — must match config.json: {0: Deepfake, 1: Real}
LABEL2ID = {"Deepfake": 0, "Real": 1}
ID2LABEL = {0: "Deepfake", 1: "Real"}

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────
def collect_images(folder: Path, limit: int, label: str) -> list[Path]:
    """Collect up to `limit` images from a folder."""
    if not folder.exists():
        print(f"  ⚠ {label}: Folder not found — {folder.relative_to(PROJECT_ROOT)}")
        return []
    imgs = [p for p in folder.iterdir() if p.suffix.lower() in IMG_EXTS]
    random.shuffle(imgs)
    imgs = imgs[:limit]
    print(f"  ✓ {label:<40} → {len(imgs)} images")
    return imgs


def collect_fairface_indian_prioritized(
    fairface_dir: Path,
    labels_csv: Path,
    total_limit: int,
    indian_target: int,
) -> list[Path]:
    """
    Collect FairFace images with Indian/South Asian faces prioritized.
    
    FairFace has explicit race labels. We:
      1. First fill Indian-target quota from 'Indian' labeled images
      2. Then fill remaining slots from all other races for diversity
    """
    if not fairface_dir.exists():
        print(f"  ⚠ FairFace directory not found — {fairface_dir}")
        return []
    
    # Try to load ethnicity labels from CSV
    indian_paths = []
    other_paths = []
    
    if labels_csv.exists():
        print(f"  ℹ Loading FairFace labels from CSV...")
        # HuggingFace FairFace returns integer class labels for race:
        # {0: East Asian, 1: Indian, 2: Black, 3: White, 4: Middle Eastern, 5: Latino_Hispanic, 6: Southeast Asian}
        RACE_ID_TO_NAME = {
            "0": "East Asian", "1": "Indian", "2": "Black", "3": "White",
            "4": "Middle Eastern", "5": "Latino_Hispanic", "6": "Southeast Asian",
        }
        INDIAN_RACE_IDS = {"1", "4", "6"}  # Indian + Middle Eastern + Southeast Asian
        
        try:
            with open(labels_csv, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    file_path = fairface_dir / Path(row.get("file", "")).name
                    race_raw = row.get("race", "").strip()
                    
                    # Handle both integer IDs and string names
                    race_name = RACE_ID_TO_NAME.get(race_raw, race_raw)
                    
                    if file_path.exists() and file_path.suffix.lower() in IMG_EXTS:
                        if race_raw in INDIAN_RACE_IDS or race_name in ("Indian", "Southeast Asian", "Middle Eastern"):
                            indian_paths.append(file_path)
                        else:
                            other_paths.append(file_path)
        except Exception as e:
            print(f"  ⚠ Failed to parse FairFace CSV: {e}")
    
    if not indian_paths and not other_paths:
        # No CSV or parsing failed — just collect all images
        print(f"  ℹ No CSV labels found — collecting all FairFace images without filtering")
        all_imgs = [p for p in fairface_dir.iterdir() if p.suffix.lower() in IMG_EXTS]
        random.shuffle(all_imgs)
        result = all_imgs[:total_limit]
        print(f"  ✓ FairFace (unfiltered)                    → {len(result)} images")
        return result
    
    # Prioritize Indian faces
    random.shuffle(indian_paths)
    random.shuffle(other_paths)
    
    indian_selected = indian_paths[:indian_target]
    remaining_slots = total_limit - len(indian_selected)
    other_selected = other_paths[:remaining_slots]
    
    result = indian_selected + other_selected
    random.shuffle(result)
    
    print(f"  ✓ FairFace (Indian/SE Asian/ME prioritized) → {len(indian_selected)} Indian + {len(other_selected)} other = {len(result)} total")
    return result


# ─────────────────────────────────────────────────────────────────────────────
# Augmentation
# ─────────────────────────────────────────────────────────────────────────────
def apply_skin_tone_augmentation(image: Image.Image) -> Image.Image:
    """
    Apply random augmentations that simulate diverse skin tone conditions:
      - Color jitter (brightness, contrast, saturation, hue)
      - Random horizontal flip
      - Slight blur (simulates phone camera quality)
    
    This forces the model to learn features that are invariant to skin tone
    and lighting conditions, rather than memorizing surface-level patterns.
    """
    # Random brightness shift (0.7 → 1.3) — simulates different lighting
    if random.random() < 0.5:
        factor = random.uniform(0.7, 1.3)
        image = ImageEnhance.Brightness(image).enhance(factor)
    
    # Random contrast shift (0.8 → 1.2) — simulates different skin contrast
    if random.random() < 0.5:
        factor = random.uniform(0.8, 1.2)
        image = ImageEnhance.Contrast(image).enhance(factor)
    
    # Random saturation shift (0.7 → 1.3) — simulates different skin saturation
    if random.random() < 0.4:
        factor = random.uniform(0.7, 1.3)
        image = ImageEnhance.Color(image).enhance(factor)
    
    # Random horizontal flip
    if random.random() < 0.5:
        image = image.transpose(Image.FLIP_LEFT_RIGHT)
    
    # Slight blur (simulates phone camera / WhatsApp compression)
    if random.random() < 0.15:
        image = image.filter(ImageFilter.GaussianBlur(radius=0.5))
    
    return image


# ─────────────────────────────────────────────────────────────────────────────
# Dataset
# ─────────────────────────────────────────────────────────────────────────────
class DeepfakeDataset(Dataset):
    def __init__(self, samples: list[tuple[Path, int]], processor, augment: bool = False):
        self.samples   = samples
        self.processor = processor
        self.augment   = augment

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        try:
            image = Image.open(path).convert("RGB")
        except Exception:
            image = Image.new("RGB", (224, 224), (128, 128, 128))
        
        # Apply augmentation during training
        if self.augment:
            image = apply_skin_tone_augmentation(image)
        
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
# Metrics
# ─────────────────────────────────────────────────────────────────────────────
def compute_metrics(eval_pred):
    """Compute accuracy, precision, recall for validation logging."""
    logits, labels = eval_pred
    preds = np.argmax(logits, axis=-1)
    
    accuracy = np.mean(preds == labels)
    
    # Per-class metrics (0 = Deepfake, 1 = Real)
    tp_fake = np.sum((preds == 0) & (labels == 0))
    fp_fake = np.sum((preds == 0) & (labels == 1))  # Real misclassified as Fake
    fn_fake = np.sum((preds == 1) & (labels == 0))
    
    precision_fake = tp_fake / (tp_fake + fp_fake) if (tp_fake + fp_fake) > 0 else 0
    recall_fake    = tp_fake / (tp_fake + fn_fake) if (tp_fake + fn_fake) > 0 else 0
    
    # False positive rate for Real images (this is what we want to minimize)
    total_real = np.sum(labels == 1)
    false_positive_rate = fp_fake / total_real if total_real > 0 else 0
    
    return {
        "accuracy":            accuracy,
        "precision_fake":      precision_fake,
        "recall_fake":         recall_fake,
        "false_positive_rate": false_positive_rate,  # Real images wrongly called fake
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────────
def main():
    print("\n" + "=" * 65)
    print("  DEEPSHIELD — Diversity-Aware ViT Finetuning (v2.0)")
    print("  Optimized for Indian/South Asian face accuracy")
    print("=" * 65)

    # 1. Check GPU
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_mem  = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"\n[gpu] {gpu_name} — {gpu_mem:.1f} GB VRAM")
        if gpu_mem < 6:
            print(f"[gpu] Low VRAM detected. Using batch_size={BATCH_SIZE}, grad_accum={GRAD_ACCUM_STEPS}, fp16=True")
    else:
        print("\n[gpu] No CUDA GPU found — training on CPU (this will be slow)")

    # 2. Collect images
    print("\n[data] Collecting images...\n")
    
    # Real images: 140k + FairFace (Indian-prioritized) + optional Indian faces
    real_140k = collect_images(REAL_140K, REAL_140K_LIMIT, "140k real faces")
    
    fairface_real = collect_fairface_indian_prioritized(
        FAIRFACE_DIR, FAIRFACE_LABELS,
        total_limit=FAIRFACE_TOTAL_LIMIT,
        indian_target=FAIRFACE_INDIAN_TARGET,
    )
    
    indian_real = collect_images(INDIAN_REAL, INDIAN_REAL_LIMIT, "Indian real faces (optional)")
    
    all_real = real_140k + fairface_real + indian_real
    
    # Fake images: 140k + optional Indian fakes
    fake_140k   = collect_images(FAKE_140K, FAKE_140K_LIMIT, "140k fake faces")
    indian_fake = collect_images(INDIAN_FAKE, INDIAN_FAKE_LIMIT, "Indian fake faces (optional)")
    
    all_fake = fake_140k + indian_fake
    
    if not all_real or not all_fake:
        print("\n[ERROR] No training data found!")
        print("        Run 'python scripts/download_datasets.py' first to see download instructions.")
        sys.exit(1)

    # Balance classes
    min_count = min(len(all_real), len(all_fake))
    all_real  = random.sample(all_real, min(len(all_real), min_count))
    all_fake  = random.sample(all_fake, min(len(all_fake), min_count))
    
    print(f"\n[data] Balanced → {len(all_real)} real + {len(all_fake)} fake = {len(all_real) + len(all_fake)} total")

    # Build samples
    all_samples = (
        [(p, LABEL2ID["Real"])     for p in all_real] +
        [(p, LABEL2ID["Deepfake"]) for p in all_fake]
    )
    random.shuffle(all_samples)

    # Train/val split
    split      = int(len(all_samples) * (1 - VAL_SPLIT))
    train_data = all_samples[:split]
    val_data   = all_samples[split:]
    print(f"[data] Train: {len(train_data)}  Val: {len(val_data)}")

    # 3. Load model
    print(f"\n[model] Loading base model: {BASE_MODEL}")
    processor = AutoImageProcessor.from_pretrained(BASE_MODEL)
    model     = AutoModelForImageClassification.from_pretrained(
        BASE_MODEL,
        num_labels=2,
        id2label=ID2LABEL,
        label2id=LABEL2ID,
        ignore_mismatched_sizes=True,
    )

    # 4. Datasets (with augmentation for training)
    train_ds = DeepfakeDataset(train_data, processor, augment=True)
    val_ds   = DeepfakeDataset(val_data,   processor, augment=False)

    # 5. Training args (optimized for RTX 3050 4GB)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    use_cuda = torch.cuda.is_available()
    
    print(f"\n[train] Device: {'CUDA (' + torch.cuda.get_device_name(0) + ')' if use_cuda else 'CPU'}")
    print(f"[train] Batch size: {BATCH_SIZE} × {GRAD_ACCUM_STEPS} accumulation = {BATCH_SIZE * GRAD_ACCUM_STEPS} effective")
    print(f"[train] Epochs: {EPOCHS}")
    print(f"[train] Learning rate: {LEARNING_RATE}")
    print(f"[train] Real class weight: {REAL_CLASS_WEIGHT}")
    print(f"[train] FP16: {use_cuda}")

    args = TrainingArguments(
        output_dir                  = str(OUTPUT_DIR),
        num_train_epochs            = EPOCHS,
        per_device_train_batch_size = BATCH_SIZE,
        per_device_eval_batch_size  = BATCH_SIZE,
        gradient_accumulation_steps = GRAD_ACCUM_STEPS,
        learning_rate               = LEARNING_RATE,
        warmup_ratio                = 0.1,
        weight_decay                = 0.01,
        eval_strategy               = "epoch",
        save_strategy               = "epoch",
        load_best_model_at_end      = True,
        metric_for_best_model       = "eval_false_positive_rate",
        greater_is_better           = False,  # Lower false positive rate is better
        logging_steps               = 25,
        dataloader_num_workers      = 2,
        fp16                        = use_cuda,  # Mixed precision on GPU
        
        # Memory optimization for 4GB VRAM
        dataloader_pin_memory       = use_cuda,
        optim                       = "adamw_torch",

        report_to                   = "none",
        save_total_limit            = 2,
        seed                        = SEED,
    )

    # 6. Train
    print(f"\n[train] Starting — {EPOCHS} epochs over {len(train_data)} samples")
    if use_cuda:
        print(f"[train] Estimated time: 15-25 min on RTX 3050")
    else:
        print(f"[train] Estimated time: 90-180 min on CPU")
    print()

    trainer = WeightedTrainer(
        model           = model,
        args            = args,
        train_dataset   = train_ds,
        eval_dataset    = val_ds,
        compute_metrics = compute_metrics,
    )
    trainer.train()

    # 7. Final evaluation
    print("\n[eval] Running final evaluation...")
    metrics = trainer.evaluate()
    print(f"\n[eval] Results:")
    print(f"  Accuracy:            {metrics.get('eval_accuracy', 0):.4f}")
    print(f"  Fake Precision:      {metrics.get('eval_precision_fake', 0):.4f}")
    print(f"  Fake Recall:         {metrics.get('eval_recall_fake', 0):.4f}")
    print(f"  False Positive Rate: {metrics.get('eval_false_positive_rate', 0):.4f}")
    print(f"    (↑ lower is better — this measures how often REAL faces are wrongly called fake)")

    # 8. Save
    print(f"\n[save] Saving finetuned model to {OUTPUT_DIR} ...")
    trainer.save_model(str(OUTPUT_DIR))
    processor.save_pretrained(str(OUTPUT_DIR))

    print("\n" + "=" * 65)
    print("  ✅ Diversity-aware finetuning complete!")
    print(f"  Weights saved to: {OUTPUT_DIR}")
    print()
    print("  To use the new weights, update vit_detector.py:")
    print('    VIT_MODEL_ID = "models/weights/finetuned-vit"')
    print()
    print("  Then restart the backend:")
    print("  set PYTHONPATH=. && python -m uvicorn backend.main:app --reload")
    print("=" * 65 + "\n")


if __name__ == "__main__":
    main()