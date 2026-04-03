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
 * Simulate AI analysis — returns a result based on filename/size
 * In production this would call the real backend API.
 */
export function simulateAnalysis(file) {
  return new Promise((resolve) => {
    const delay = 1800 + Math.random() * 1400;

    setTimeout(() => {
      const seed = (file.name.length * 7 + file.size) % 100;

      let verdict, confidence, issues, regions;

      if (seed < 33) {
        verdict = 'real';
        confidence = 88 + Math.floor(Math.random() * 11);
        issues = [];
        regions = [];
      } else if (seed < 66) {
        verdict = 'fake';
        confidence = 79 + Math.floor(Math.random() * 18);
        issues = [
          { id: 'skin',      label: 'Skin texture mismatch',        severity: 'high' },
          { id: 'lighting',  label: 'Lighting inconsistency detected', severity: 'high' },
          { id: 'eyes',      label: 'Eye reflection anomalies',     severity: 'medium' },
          { id: 'boundary',  label: 'Face boundary artifacts',      severity: 'medium' },
        ];
        regions = [
          { id: 'r1', label: 'Eye Region',    x: 18, y: 22, w: 28, h: 14, color: '#ef4444', issueId: 'eyes' },
          { id: 'r2', label: 'Jaw / Boundary', x: 12, y: 68, w: 74, h: 14, color: '#f59e0b', issueId: 'boundary' },
          { id: 'r3', label: 'Skin Patch',    x: 55, y: 35, w: 30, h: 22, color: '#ef4444', issueId: 'skin' },
        ];
      } else {
        verdict = 'suspicious';
        confidence = 55 + Math.floor(Math.random() * 20);
        issues = [
          { id: 'lighting',    label: 'Subtle lighting inconsistency',   severity: 'medium' },
          { id: 'compression', label: 'Unusual compression artifacts',   severity: 'low' },
        ];
        regions = [
          { id: 'r1', label: 'Lighting Zone', x: 10, y: 15, w: 40, h: 30, color: '#f59e0b', issueId: 'lighting' },
        ];
      }

      resolve({ verdict, confidence, issues, regions });
    }, delay);
  });
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
