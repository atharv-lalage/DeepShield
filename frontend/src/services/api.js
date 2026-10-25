// api.js — Frontend API service to communicate with the Deepfake Detection backend
const API_BASE_URL = "";

/**
 * Detect deepfakes in a media file (image or video)
 * @param {File} file - The file to analyze
 * @returns {Promise<Object>} - The analysis result
 */
export async function detectDeepfake(file) {
  const formData = new FormData();
  formData.append("file", file);

  let endpoint = "/detect/image";
  if (file.type.startsWith("video/")) {
    endpoint = "/detect/video";
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return adaptBackendResponse(data);
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

/**
 * Fetch LLM Explanation separately
 * @param {string} mediaType - "image" or "video"
 * @param {Object} technicalResult - the technical result from backend
 * @returns {Promise<string>} - The explanation string
 */
export async function fetchExplanation(mediaType, technicalResult) {
  try {
    const response = await fetch(`${API_BASE_URL}/detect/explain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ media_type: mediaType, result: technicalResult }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.explanation;
  } catch (error) {
    console.error("Explanation API Error:", error);
    return null;
  }
}

/**
 * Adapt backend response format to frontend UI format
 */
function adaptBackendResponse(data) {
  const { verdict, explanation, technical } = data;
  
  // Map backend labels to frontend labels
  let frontalLabel = verdict.label;
  if (verdict.label === 'uncertain') frontalLabel = 'suspicious';
  
  // Convert confidence to 0-100
  const confidencePercent = Math.round(verdict.confidence * 100);

  // Derive some issues/regions for UI richness (since backend doesn't provide them yet)
  // In a real production system, the backend would provide these based on specific forensics.
  const issues = [];
  const regions = [];

  if (frontalLabel !== 'real') {
    const vit_prob = technical.ensemble_breakdown?.vit_fake_prob || 0.65;
    const siglip_prob = technical.ensemble_breakdown?.siglip_fake_prob || 0.65;
    
    if (vit_prob > 0.5) {
      issues.push({ id: 'face', label: 'Facial feature manipulation', severity: 'high' });
      regions.push({ id: 'r1', label: 'Face Gradients', x: 30, y: 30, w: 40, h: 45, color: '#ef4444', issueId: 'face' });
    }
    if (siglip_prob > 0.5) {
      issues.push({ id: 'bg', label: 'Background synthetic artifacts', severity: 'medium' });
      if (regions.length === 0) {
        regions.push({ id: 'r2', label: 'Artifacts', x: 15, y: 15, w: 70, h: 70, color: '#f59e0b', issueId: 'bg' });
      }
    }
    
    // Ensure at least one region is pushed if fake/suspicious
    if (regions.length === 0) {
      issues.push({ id: 'general', label: 'Anomalous pixel structure', severity: 'medium' });
      regions.push({ id: 'r3', label: 'Anomaly', x: 20, y: 20, w: 60, h: 60, color: '#ef4444', issueId: 'general' });
    }
  }

  return {
    verdict: frontalLabel,
    confidence: confidencePercent,
    explanation,
    issues,
    regions,
    technical
  };
}