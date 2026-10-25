import React from 'react';

export const EXT_MAP = {
  image: ["PNG", "JPG", "JPEG", "WEBP", "GIF", "BMP", "TIFF"],
  video: ["MP4", "MOV", "AVI", "WEBM", "MKV", "FLV"],
};

export function getType(filename) {
  const ext = filename.split(".").pop().toUpperCase();
  if (EXT_MAP.image.includes(ext)) return "image";
  if (EXT_MAP.video.includes(ext)) return "video";
  return "unknown";
}

export function isValidImageType(file) {
  return file.type.startsWith('image/');
}

export function createPreviewUrl(file) {
  return URL.createObjectURL(file);
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename) {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toUpperCase();
}

export function getVerdictMeta(verdict) {
  const meta = {
    real: { label: 'Authentic', color: 'var(--color-real)' },
    fake: { label: 'Deepfake', color: 'var(--color-fake)' },
    suspicious: { label: 'Suspicious', color: 'var(--color-suspicious)' },
  };
  return meta[verdict] || { label: 'Unknown', color: 'var(--color-text-muted)' };
}

export async function simulateAnalysis(file) {
  await new Promise(r => setTimeout(r, 2200 + Math.random() * 1500));
  const rand = Math.random();
  const verdict = rand > 0.6 ? 'fake' : (rand > 0.35 ? 'suspicious' : 'real');
  const confidence = Math.floor(82 + Math.random() * 17);
  
  const regions = verdict === 'real' ? [] : [
    { id: 'r1', label: 'Face Gradients', x: 30, y: 35, w: 40, h: 45, color: '#ef4444', issueId: 'i1' },
    { id: 'r2', label: 'Eye Artifacts', x: 38, y: 42, w: 24, h: 10, color: '#f59e0b', issueId: 'i2' }
  ];

  const issues = verdict === 'real' ? [] : [
    { id: 'i1', label: 'Inconsistent pixel patterns detected on facial surface', severity: 'high' },
    { id: 'i2', label: 'Temporal jitter in orbital regions', severity: 'medium' }
  ];

  return { verdict, confidence, regions, issues };
}

export const TYPE_ICON = {
  image: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
    </svg>
  ),
  video: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/>
    </svg>
  ),
  unknown: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14.5 2 14.5 7.5 20 7.5"/>
    </svg>
  ),
};

export const TYPE_LABEL = {
  image: "Image",
  video: "Video",
  unknown: "File",
};
