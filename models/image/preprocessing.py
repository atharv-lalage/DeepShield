"""
DeepShield — Skin-Tone-Aware Image Preprocessing
==================================================
Normalizes images before classification to reduce bias across skin tones.

Key techniques:
  1. CLAHE (Contrast Limited Adaptive Histogram Equalization)
     → Boosts micro-texture details on darker skin that ViT needs to detect artifacts
  2. White-Balance Correction
     → Neutralizes color cast from varying lighting (indoor tungsten, harsh sun, etc.)
  3. Adaptive Sharpening
     → Recovers edge detail lost in compression, especially on melanin-rich skin
"""

import cv2
import numpy as np
from PIL import Image


def pil_to_cv2(pil_image: Image.Image) -> np.ndarray:
    """Convert PIL Image (RGB) to OpenCV format (BGR)."""
    return cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)


def cv2_to_pil(cv2_image: np.ndarray) -> Image.Image:
    """Convert OpenCV format (BGR) to PIL Image (RGB)."""
    return Image.fromarray(cv2.cvtColor(cv2_image, cv2.COLOR_BGR2RGB))


def apply_clahe(image: np.ndarray, clip_limit: float = 2.5, grid_size: int = 8) -> np.ndarray:
    """
    Apply CLAHE (Contrast Limited Adaptive Histogram Equalization).
    
    This is the single most impactful preprocessing step for darker skin tones.
    Standard histogram equalization washes out details, but CLAHE operates on
    local patches, preserving natural appearance while boosting the subtle
    texture gradients that deepfake detectors rely on.
    
    Args:
        image: BGR image (OpenCV format)
        clip_limit: Contrast limiting threshold (higher = more contrast)
        grid_size: Size of the local patches for adaptive equalization
    """
    # Convert to LAB color space — we only equalize the L (lightness) channel
    # This preserves color information while boosting contrast
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    l_channel, a_channel, b_channel = cv2.split(lab)
    
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(grid_size, grid_size))
    l_enhanced = clahe.apply(l_channel)
    
    lab_enhanced = cv2.merge([l_enhanced, a_channel, b_channel])
    return cv2.cvtColor(lab_enhanced, cv2.COLOR_LAB2BGR)


def apply_white_balance(image: np.ndarray) -> np.ndarray:
    """
    Apply simple white balance correction using the Gray World assumption.
    
    Normalizes color channels so that the average color of the image is neutral gray.
    This helps when photos of Indian/South Asian faces are taken under warm tungsten
    lighting or harsh sunlight, which can introduce color casts that confuse the model.
    """
    result = image.copy().astype(np.float32)
    avg_b = np.mean(result[:, :, 0])
    avg_g = np.mean(result[:, :, 1])
    avg_r = np.mean(result[:, :, 2])
    avg_gray = (avg_b + avg_g + avg_r) / 3.0
    
    if avg_b > 0:
        result[:, :, 0] *= avg_gray / avg_b
    if avg_g > 0:
        result[:, :, 1] *= avg_gray / avg_g
    if avg_r > 0:
        result[:, :, 2] *= avg_gray / avg_r
    
    return np.clip(result, 0, 255).astype(np.uint8)


def apply_adaptive_sharpening(image: np.ndarray, strength: float = 0.3) -> np.ndarray:
    """
    Light unsharp mask to recover edge details.
    
    Deepfake artifacts often appear at boundaries (jawline, hairline, around eyes).
    JPEG compression + darker skin can blur these edges. A gentle sharpen brings
    them back without introducing noise.
    """
    gaussian = cv2.GaussianBlur(image, (0, 0), sigmaX=2.0)
    sharpened = cv2.addWeighted(image, 1.0 + strength, gaussian, -strength, 0)
    return np.clip(sharpened, 0, 255).astype(np.uint8)


def estimate_skin_tone(image: np.ndarray) -> str:
    """
    Rough skin tone estimation based on average luminance of the face region.
    
    Returns: 'light', 'medium', or 'dark'
    Used to adaptively tune CLAHE parameters — darker skin benefits from
    slightly higher clip limits to reveal hidden texture detail.
    """
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    avg_luminance = np.mean(lab[:, :, 0])
    
    if avg_luminance > 170:
        return "light"
    elif avg_luminance > 120:
        return "medium"
    else:
        return "dark"


def preprocess_face(pil_image: Image.Image, apply_all: bool = True) -> Image.Image:
    """
    Full preprocessing pipeline for a detected face crop.
    
    Adaptively adjusts processing intensity based on estimated skin tone:
    - Light skin: minimal processing (the models already handle this well)
    - Medium skin: moderate CLAHE + white balance
    - Dark skin: stronger CLAHE + white balance + sharpening
    
    Args:
        pil_image: The face crop as a PIL Image (RGB)
        apply_all: If False, only applies CLAHE (useful for training augmentation)
    
    Returns:
        Preprocessed PIL Image (RGB)
    """
    cv2_img = pil_to_cv2(pil_image)
    skin_tone = estimate_skin_tone(cv2_img)
    
    # Adaptive CLAHE parameters based on skin tone
    clahe_params = {
        "light":  {"clip_limit": 1.5, "grid_size": 8},
        "medium": {"clip_limit": 2.5, "grid_size": 8},
        "dark":   {"clip_limit": 3.5, "grid_size": 6},  # Stronger + finer grid for dark skin
    }
    
    params = clahe_params[skin_tone]
    result = apply_clahe(cv2_img, **params)
    
    if apply_all:
        result = apply_white_balance(result)
        
        # Only sharpen medium/dark skin tones — light skin rarely needs it
        if skin_tone in ("medium", "dark"):
            result = apply_adaptive_sharpening(result, strength=0.25)
    
    return cv2_to_pil(result)


def preprocess_for_detection(pil_image: Image.Image) -> Image.Image:
    """
    Lighter preprocessing applied BEFORE face detection.
    
    Boosts overall image contrast so the face detector (RetinaFace/MTCNN)
    has a better chance of finding faces on darker skin tones under poor lighting.
    """
    cv2_img = pil_to_cv2(pil_image)
    enhanced = apply_clahe(cv2_img, clip_limit=2.0, grid_size=8)
    return cv2_to_pil(enhanced)
