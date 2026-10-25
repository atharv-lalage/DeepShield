// fileUtils.js — Utility helpers for file handling & simulation

/**
 * Format bytes into human-readable string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Get file extension
 */
export function getFileExtension(filename) {
  return filename.split('.').pop().toUpperCase();
}

/**
 * Check if file is an image
 */
export function isImage(file) {
  return file.type.startsWith('image/');
}

/**
 * Validate if file is a supported image type
 */
export function isValidImageType(file) {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp'];
  return validTypes.includes(file.type);
}

/**
 * Create an object URL for a file
 */
export function createPreviewUrl(file) {
  return URL.createObjectURL(file);
}

/**
 * Run AI analysis by calling the real backend API.
 * Replaces the former simulateAnalysis mock.
 */
export async function simulateAnalysis(file) {
  const { detectDeepfake } = await import('../services/api');
  return detectDeepfake(file);
}

/**
 * Get verdict meta (label, color class)
 */
export function getVerdictMeta(verdict) {
  switch (verdict) {
    case 'real':       return { label: 'Authentic',  colorVar: '--color-real',        className: 'result-real' };
    case 'fake':       return { label: 'Deepfake',   colorVar: '--color-fake',        className: 'result-fake' };
    case 'suspicious': return { label: 'Suspicious', colorVar: '--color-suspicious',  className: 'result-suspicious' };
    default:           return { label: 'Unknown',    colorVar: '--color-text-muted',  className: '' };
  }
}