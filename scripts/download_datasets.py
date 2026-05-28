"""
DeepShield — Automated Dataset Download & Preparation Script
==============================================================
Automatically downloads diverse training data for finetuning.

Datasets:
  1. FairFace (from HuggingFace Hub — diverse real faces with ethnicity labels)
  2. 140k Real and Fake Faces (from HuggingFace Hub)

Usage:
  set PYTHONPATH=.
  python scripts/download_datasets.py
"""

import os
import sys
import shutil
from pathlib import Path
from PIL import Image

PROJECT_ROOT = Path(__file__).parent.parent
IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

# Output directories
FAIRFACE_DIR      = PROJECT_ROOT / "data" / "raw" / "fairface" / "train"
FAIRFACE_LABELS   = PROJECT_ROOT / "data" / "raw" / "fairface" / "fairface_label_train.csv"
REAL_140K_DIR     = PROJECT_ROOT / "data" / "raw" / "fake140k" / "real_vs_fake" / "real-vs-fake" / "train" / "real"
FAKE_140K_DIR     = PROJECT_ROOT / "data" / "raw" / "fake140k" / "real_vs_fake" / "real-vs-fake" / "train" / "fake"
INDIAN_REAL_DIR   = PROJECT_ROOT / "data" / "raw" / "indian_faces" / "real"
INDIAN_FAKE_DIR   = PROJECT_ROOT / "data" / "raw" / "indian_faces" / "fake"


def setup_data_dirs():
    """Create the data directory structure."""
    dirs = [
        FAIRFACE_DIR, REAL_140K_DIR, FAKE_140K_DIR,
        INDIAN_REAL_DIR, INDIAN_FAKE_DIR,
        PROJECT_ROOT / "data" / "processed" / "train" / "real",
        PROJECT_ROOT / "data" / "processed" / "train" / "fake",
        PROJECT_ROOT / "data" / "processed" / "val" / "real",
        PROJECT_ROOT / "data" / "processed" / "val" / "fake",
    ]
    for d in dirs:
        d.mkdir(parents=True, exist_ok=True)


def count_images(folder: Path) -> int:
    """Count image files in a folder."""
    if not folder.exists():
        return 0
    return len([p for p in folder.iterdir() if p.suffix.lower() in IMG_EXTS])


def download_fairface():
    """
    Download FairFace dataset from HuggingFace Hub.
    This dataset has ethnicity labels including 'Indian'.
    """
    existing = count_images(FAIRFACE_DIR)
    if existing >= 1000:
        print(f"  ✓ FairFace already has {existing} images — skipping download")
        return True

    print("  ↓ Downloading FairFace from HuggingFace Hub...")
    print("    (This is ~3GB and may take a few minutes)\n")

    try:
        from datasets import load_dataset

        # Load FairFace from HuggingFace — config '0.25' = 0.25 padding ratio
        ds = load_dataset("HuggingFaceM4/FairFace", "0.25", split="train")

        print(f"    Loaded {len(ds)} images from HuggingFace")
        print(f"    Saving images + generating labels CSV...")

        # Save images and create labels CSV
        csv_lines = ["file,race,age,gender"]
        saved = 0

        for idx, item in enumerate(ds):
            try:
                img = item.get("image")
                race = item.get("race", "Unknown")
                age = item.get("age", "Unknown")
                gender = item.get("gender", "Unknown")

                if img is None:
                    continue

                # Save image
                filename = f"fairface_{idx:06d}.jpg"
                filepath = FAIRFACE_DIR / filename

                if not filepath.exists():
                    if not isinstance(img, Image.Image):
                        continue
                    img = img.convert("RGB")
                    img.save(filepath, "JPEG", quality=90)

                csv_lines.append(f"{filename},{race},{age},{gender}")
                saved += 1

                if saved % 2000 == 0:
                    print(f"    ... saved {saved} images")

            except Exception as e:
                continue

        # Write labels CSV
        with open(FAIRFACE_LABELS, "w", encoding="utf-8") as f:
            f.write("\n".join(csv_lines))

        print(f"    ✅ Saved {saved} FairFace images + labels CSV")
        return True

    except ImportError:
        print("    ✗ 'datasets' package not installed. Run: pip install datasets")
        return False
    except Exception as e:
        print(f"    ✗ Download failed: {e}")
        return False


def download_140k_faces():
    """
    Download 140k Real and Fake Faces.
    Tries HuggingFace Hub first, falls back to manual instructions.
    """
    existing_real = count_images(REAL_140K_DIR)
    existing_fake = count_images(FAKE_140K_DIR)

    if existing_real >= 1000 and existing_fake >= 1000:
        print(f"  ✓ 140k dataset already has {existing_real} real + {existing_fake} fake images — skipping")
        return True

    print("  ↓ Downloading 140k Real and Fake Faces...")

    try:
        from datasets import load_dataset

        # Hemg/deepfake-and-real-images — 190k+ images, real/fake labeled
        ds = load_dataset("Hemg/deepfake-and-real-images", split="train")

        print(f"    Loaded {len(ds)} images from HuggingFace")

        saved_real = 0
        saved_fake = 0

        for idx, item in enumerate(ds):
            try:
                img = item.get("image")
                label = item.get("label", -1)

                if img is None:
                    continue

                if not isinstance(img, Image.Image):
                    continue

                img = img.convert("RGB")

                # label mapping: typically 0=fake, 1=real (check dataset docs)
                if label == 1:  # Real
                    filename = f"real_{idx:06d}.jpg"
                    filepath = REAL_140K_DIR / filename
                    if not filepath.exists():
                        img.save(filepath, "JPEG", quality=90)
                    saved_real += 1
                elif label == 0:  # Fake
                    filename = f"fake_{idx:06d}.jpg"
                    filepath = FAKE_140K_DIR / filename
                    if not filepath.exists():
                        img.save(filepath, "JPEG", quality=90)
                    saved_fake += 1

                if (saved_real + saved_fake) % 2000 == 0:
                    print(f"    ... saved {saved_real} real + {saved_fake} fake")

                # Limit to 3000 each to keep training manageable
                if saved_real >= 3000 and saved_fake >= 3000:
                    break

            except Exception:
                continue

        print(f"    ✅ Saved {saved_real} real + {saved_fake} fake images")
        return True

    except ImportError:
        print("    ✗ 'datasets' package not installed. Run: pip install datasets")
        return False
    except Exception as e:
        print(f"    ✗ Auto-download failed: {e}")
        print(f"    Trying alternative dataset...")
        return download_140k_alternative()


def download_140k_alternative():
    """Fallback: try a different real/fake face dataset from HuggingFace."""
    try:
        from datasets import load_dataset

        print("    ↓ Trying alternative dataset: prithivMLmods/Deepfake-vs-Real-60K...")
        ds = load_dataset("prithivMLmods/Deepfake-vs-Real-60K", split="train")

        print(f"    Loaded {len(ds)} images")

        saved_real = 0
        saved_fake = 0

        for idx, item in enumerate(ds):
            try:
                img = item.get("image")
                label = item.get("label", -1)

                if img is None or not isinstance(img, Image.Image):
                    continue

                img = img.convert("RGB")

                if label == 1:  # Real
                    filename = f"real_alt_{idx:06d}.jpg"
                    filepath = REAL_140K_DIR / filename
                    if not filepath.exists():
                        img.save(filepath, "JPEG", quality=90)
                    saved_real += 1
                elif label == 0:  # Fake
                    filename = f"fake_alt_{idx:06d}.jpg"
                    filepath = FAKE_140K_DIR / filename
                    if not filepath.exists():
                        img.save(filepath, "JPEG", quality=90)
                    saved_fake += 1

                if saved_real >= 3000 and saved_fake >= 3000:
                    break

            except Exception:
                continue

        print(f"    ✅ Saved {saved_real} real + {saved_fake} fake images (alternative)")
        return True

    except Exception as e:
        print(f"    ✗ Alternative also failed: {e}")
        print_manual_instructions()
        return False


def print_manual_instructions():
    """Print manual download instructions as a last resort."""
    print("""
    ┌─────────────────────────────────────────────────────────────────┐
    │ Manual Download Required:                                       │
    │                                                                 │
    │ 140k Real and Fake Faces (Kaggle):                             │
    │   URL: https://www.kaggle.com/datasets/xhlulu/140k-real-and-   │
    │        fake-faces                                               │
    │   Place real images in: data/raw/fake140k/.../train/real/       │
    │   Place fake images in: data/raw/fake140k/.../train/fake/       │
    └─────────────────────────────────────────────────────────────────┘
    """)


def check_final_status():
    """Print final status of all datasets."""
    print("\n" + "-" * 60)
    print("  DATASET STATUS")
    print("-" * 60)

    checks = {
        "FairFace (train images)": FAIRFACE_DIR,
        "FairFace (labels CSV)":   FAIRFACE_LABELS,
        "140k Real Faces":         REAL_140K_DIR,
        "140k Fake Faces":         FAKE_140K_DIR,
        "Indian Real Faces":       INDIAN_REAL_DIR,
        "Indian Fake Faces":       INDIAN_FAKE_DIR,
    }

    ready = True
    for name, path in checks.items():
        if path.is_file():
            print(f"  ✓ {name}: Found")
        elif path.is_dir():
            count = count_images(path)
            if count > 0:
                print(f"  ✓ {name}: {count} images")
            else:
                status = "⚠ Empty (optional)" if "Indian" in name else "✗ EMPTY — REQUIRED"
                print(f"  {status}: {name}")
                if "Indian" not in name:
                    ready = False
        else:
            print(f"  ✗ {name}: Not found")
            if "Indian" not in name and "labels" not in name.lower():
                ready = False

    print()
    if ready:
        print("  ✅ Ready to finetune! Run:")
        print("     set PYTHONPATH=.")
        print("     python scripts/finetune.py")
    else:
        print("  ❌ Some required datasets are missing.")
        print("     Check the errors above and download the missing data.")

    print("-" * 60 + "\n")


def main():
    print("\n" + "=" * 60)
    print("  DeepShield — Automated Dataset Download")
    print("=" * 60)

    # Create directories
    print("\n[1/4] Creating directory structure...")
    setup_data_dirs()
    print("  ✓ Directories ready\n")

    # Download FairFace
    print("[2/4] FairFace Dataset (diverse real faces with ethnicity labels)")
    download_fairface()
    print()

    # Download 140k
    print("[3/4] Real & Fake Faces Dataset")
    download_140k_faces()
    print()

    # Indian faces info
    print("[4/4] Indian Face Images (optional but recommended)")
    indian_count = count_images(INDIAN_REAL_DIR)
    if indian_count > 0:
        print(f"  ✓ Found {indian_count} Indian real face images")
    else:
        print("  ℹ No Indian-specific images found.")
        print("    For best results, add 500-1000 real Indian face photos to:")
        print(f"    {INDIAN_REAL_DIR}")
        print("    (Your own photos, friends' photos, or public datasets)")
    print()

    # Final status
    check_final_status()


if __name__ == "__main__":
    main()
