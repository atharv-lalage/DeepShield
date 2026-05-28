"""
DeepShield — Diversity-Aware Evaluation Pipeline
==================================================
Tests model accuracy broken down by skin tone and ethnicity.

Generates a per-demographic accuracy table showing:
  - False Positive Rate (real images wrongly flagged as fake)
  - False Negative Rate (fake images wrongly flagged as real)
  - Overall accuracy per demographic group

Usage:
  PYTHONPATH=. python scripts/eval_diversity.py

Requires:
  - data/raw/fairface/train/ (with labels CSV)
  - data/raw/indian_faces/real/ (optional)
  - Backend models loaded (the script loads them directly)
"""

import csv
import io
import sys
import os
import time
from pathlib import Path
from collections import defaultdict

import torch
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent.parent))

from models.image.ensemble import classify_image, load_models


PROJECT_ROOT = Path(__file__).parent.parent
FAIRFACE_DIR    = PROJECT_ROOT / "data" / "raw" / "fairface" / "train"
FAIRFACE_LABELS = PROJECT_ROOT / "data" / "raw" / "fairface" / "fairface_label_train.csv"
INDIAN_REAL     = PROJECT_ROOT / "data" / "raw" / "indian_faces" / "real"
INDIAN_FAKE     = PROJECT_ROOT / "data" / "raw" / "indian_faces" / "fake"
FAKE_140K       = PROJECT_ROOT / "data" / "raw" / "fake140k" / "real_vs_fake" / "real-vs-fake" / "train" / "fake"

IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp"}

# How many images to test per demographic (for speed)
SAMPLES_PER_GROUP = 50


def collect_fairface_by_race(limit_per_race: int = SAMPLES_PER_GROUP) -> dict:
    """
    Group FairFace images by race label.
    Returns: {race: [list of (path, ground_truth_label)]}
    """
    groups = defaultdict(list)
    
    if not FAIRFACE_DIR.exists() or not FAIRFACE_LABELS.exists():
        print("[eval] FairFace dataset or labels not found — skipping race-based evaluation")
        return groups
    
    try:
        with open(FAIRFACE_LABELS, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                file_path = FAIRFACE_DIR / Path(row.get("file", "")).name
                race = row.get("race", "Unknown").strip()
                
                if file_path.exists() and file_path.suffix.lower() in IMG_EXTS:
                    groups[race].append((file_path, "real"))
    except Exception as e:
        print(f"[eval] Error reading FairFace CSV: {e}")
    
    # Limit per group
    for race in groups:
        if len(groups[race]) > limit_per_race:
            import random
            random.shuffle(groups[race])
            groups[race] = groups[race][:limit_per_race]
    
    return groups


def collect_generic_fake(limit: int = SAMPLES_PER_GROUP) -> list:
    """Collect generic fake images for false-negative testing."""
    if not FAKE_140K.exists():
        return []
    
    imgs = [p for p in FAKE_140K.iterdir() if p.suffix.lower() in IMG_EXTS]
    import random
    random.shuffle(imgs)
    return [(p, "fake") for p in imgs[:limit]]


def evaluate_group(samples: list, group_name: str) -> dict:
    """
    Evaluate a group of (path, ground_truth) samples.
    Returns accuracy metrics for the group.
    """
    if not samples:
        return None
    
    results = {
        "group": group_name,
        "total": len(samples),
        "correct": 0,
        "false_positive": 0,  # Real called Fake
        "false_negative": 0,  # Fake called Real
        "uncertain": 0,
        "face_detected_count": 0,
        "avg_confidence": 0.0,
        "errors": 0,
    }
    
    confidences = []
    
    for path, ground_truth in samples:
        try:
            with open(path, "rb") as f:
                image_bytes = f.read()
            
            prediction = classify_image(image_bytes)
            pred_label = prediction["label"]
            confidence = prediction["confidence"]
            face_detected = prediction.get("face_detected", False)
            
            confidences.append(confidence)
            if face_detected:
                results["face_detected_count"] += 1
            
            if pred_label == "uncertain":
                results["uncertain"] += 1
            elif pred_label == ground_truth:
                results["correct"] += 1
            elif ground_truth == "real" and pred_label == "fake":
                results["false_positive"] += 1
            elif ground_truth == "fake" and pred_label == "real":
                results["false_negative"] += 1
            else:
                results["correct"] += 1  # uncertain counted as correct-ish
                
        except Exception as e:
            results["errors"] += 1
    
    results["avg_confidence"] = np.mean(confidences) if confidences else 0
    results["accuracy"] = results["correct"] / results["total"] if results["total"] > 0 else 0
    results["fpr"] = results["false_positive"] / sum(1 for _, gt in samples if gt == "real") if any(gt == "real" for _, gt in samples) else 0
    results["fnr"] = results["false_negative"] / sum(1 for _, gt in samples if gt == "fake") if any(gt == "fake" for _, gt in samples) else 0
    results["face_detection_rate"] = results["face_detected_count"] / results["total"] if results["total"] > 0 else 0
    
    return results


def print_results_table(all_results: list):
    """Print a formatted comparison table."""
    print("\n" + "=" * 100)
    print("  DIVERSITY EVALUATION RESULTS")
    print("=" * 100)
    
    header = f"{'Group':<25} {'N':>5} {'Acc':>7} {'FPR':>7} {'FNR':>7} {'Face%':>7} {'Conf':>7} {'FP':>5} {'FN':>5} {'Unc':>5}"
    print(header)
    print("-" * 100)
    
    for r in all_results:
        if r is None:
            continue
        row = (
            f"{r['group']:<25} "
            f"{r['total']:>5} "
            f"{r['accuracy']:>6.1%} "
            f"{r['fpr']:>6.1%} "
            f"{r['fnr']:>6.1%} "
            f"{r['face_detection_rate']:>6.1%} "
            f"{r['avg_confidence']:>6.3f} "
            f"{r['false_positive']:>5} "
            f"{r['false_negative']:>5} "
            f"{r['uncertain']:>5}"
        )
        print(row)
    
    print("-" * 100)
    print()
    print("Legend:")
    print("  Acc   = Overall accuracy (higher is better)")
    print("  FPR   = False Positive Rate: real images wrongly called fake (LOWER is better)")
    print("  FNR   = False Negative Rate: fake images wrongly called real (LOWER is better)")
    print("  Face% = Face detection success rate")
    print("  Conf  = Average confidence score")
    print("  FP    = Count of false positives")
    print("  FN    = Count of false negatives")
    print("  Unc   = Count of uncertain verdicts")
    print()
    
    # Highlight concerning results
    for r in all_results:
        if r and r["fpr"] > 0.20:
            print(f"  ⚠ WARNING: {r['group']} has {r['fpr']:.0%} false positive rate — real faces being called fake!")
        if r and r["face_detection_rate"] < 0.70:
            print(f"  ⚠ WARNING: {r['group']} has only {r['face_detection_rate']:.0%} face detection rate!")


def main():
    print("\n" + "=" * 65)
    print("  DEEPSHIELD — Diversity Evaluation Pipeline")
    print("=" * 65)
    
    # Load models
    print("\n[eval] Loading models...")
    load_models()
    
    all_results = []
    
    # 1. Evaluate FairFace by race
    print("\n[eval] Collecting FairFace images by race...")
    race_groups = collect_fairface_by_race()
    
    if race_groups:
        for race, samples in sorted(race_groups.items()):
            print(f"\n[eval] Evaluating: {race} ({len(samples)} real images)...")
            start = time.time()
            result = evaluate_group(samples, f"{race} (real)")
            elapsed = time.time() - start
            print(f"  Done in {elapsed:.1f}s — Accuracy: {result['accuracy']:.1%}, FPR: {result['fpr']:.1%}")
            all_results.append(result)
    
    # 2. Evaluate Indian-specific faces (if available)
    if INDIAN_REAL.exists():
        indian_samples = [
            (p, "real") for p in INDIAN_REAL.iterdir()
            if p.suffix.lower() in IMG_EXTS
        ][:SAMPLES_PER_GROUP]
        
        if indian_samples:
            print(f"\n[eval] Evaluating: Indian Faces — custom set ({len(indian_samples)} images)...")
            result = evaluate_group(indian_samples, "Indian (custom real)")
            all_results.append(result)
    
    if INDIAN_FAKE.exists():
        indian_fake_samples = [
            (p, "fake") for p in INDIAN_FAKE.iterdir()
            if p.suffix.lower() in IMG_EXTS
        ][:SAMPLES_PER_GROUP]
        
        if indian_fake_samples:
            print(f"\n[eval] Evaluating: Indian Fakes — custom set ({len(indian_fake_samples)} images)...")
            result = evaluate_group(indian_fake_samples, "Indian (custom fake)")
            all_results.append(result)
    
    # 3. Generic fake images (for false negative baseline)
    fake_samples = collect_generic_fake()
    if fake_samples:
        print(f"\n[eval] Evaluating: Generic Fakes ({len(fake_samples)} images)...")
        result = evaluate_group(fake_samples, "Generic Fakes")
        all_results.append(result)
    
    # Print results
    if all_results:
        print_results_table(all_results)
    else:
        print("\n[eval] No data available for evaluation.")
        print("       Run 'python scripts/download_datasets.py' for setup instructions.")
    
    # Model info
    from models.image.vit_detector import get_model_info
    info = get_model_info()
    print(f"\n[info] ViT model source: {info['model_source']}")
    print(f"[info] Finetuned weights: {'✅ loaded' if info['finetuned_exists'] else '❌ not found'}")
    print(f"[info] Device: {info['device']}")


if __name__ == "__main__":
    main()
