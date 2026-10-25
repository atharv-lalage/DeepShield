// Modalities.jsx — Clean detection modality grid
import React, { useState } from 'react';
import { ScanEye, Cpu, Activity, Fingerprint, Layers, Waves } from 'lucide-react';

const MODALITIES = [
  {
    id: 'facial',
    icon: <ScanEye size={18} />,
    title: 'Facial Landmark Analysis',
    desc: 'Checks 468 landmark positions for asymmetry, proportional deviations, and unnatural geometry common in GAN outputs.',
    tags: ['GAN Detection', 'Geometry', '468 pts'],
  },
  {
    id: 'texture',
    icon: <Fingerprint size={18} />,
    title: 'Skin Texture Analysis',
    desc: 'Micro-texture patterns extracted via frequency domain analysis expose synthetic skin generation signatures.',
    tags: ['Frequency', 'Pore Analysis'],
  },
  {
    id: 'eye',
    icon: <Activity size={18} />,
    title: 'Eye Reflection Mapping',
    desc: 'Real corneas produce consistent, physically plausible specular reflections. Deepfakes exhibit bilateral inconsistencies.',
    tags: ['Specular', 'Cornea Map'],
  },
  {
    id: 'frequency',
    icon: <Waves size={18} />,
    title: 'Frequency Domain',
    desc: 'CNN-based upsampling leaves characteristic checkerboard artifacts in the DCT spectrum, detectable even after re-encoding.',
    tags: ['DCT', 'FFT', 'CNN Artifacts'],
  },
  {
    id: 'blending',
    icon: <Layers size={18} />,
    title: 'Blend Boundary Detection',
    desc: 'Identifies seams at facial boundaries where a synthetic face has been composited onto a real background.',
    tags: ['FaceSwap', 'Alpha Matte'],
  },
  {
    id: 'compression',
    icon: <Cpu size={18} />,
    title: 'Compression Forensics',
    desc: 'Deepfakes inherit double-compression artifacts from encoding through multiple generation and save cycles.',
    tags: ['JPEG', 'Block Artifacts'],
  },
];

export default function Modalities() {
  const [active, setActive] = useState(null);

  return (
    <section id="modalities" className="section" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="container">

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '48px', flexWrap: 'wrap', gap: '24px' }}>
          <div>
            <div className="section-label">Detection Modalities</div>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Six engines. One verdict.</h2>
          </div>
          <p style={{
            fontSize: '0.9rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.7,
            maxWidth: '400px',
          }}>
            Every file is processed through six independent detectors simultaneously,
            each targeting a different class of deepfake signature.
          </p>
        </div>

        <div className="grid-3">
          {MODALITIES.map((m, i) => (
            <div
              key={m.id}
              className="modality-card"
              onClick={() => setActive(active === m.id ? null : m.id)}
              style={{
                animation: `fadeInUp 0.5s ${i * 0.07}s ease both`,
                background: active === m.id ? 'var(--color-surface-raised)' : undefined,
                borderColor: active === m.id ? 'var(--color-border-strong)' : undefined,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 40, height: 40,
                borderRadius: '10px',
                background: 'var(--color-surface-subtle)',
                border: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-text-muted)',
                marginBottom: '20px',
              }}>
                {m.icon}
              </div>

              <h3 style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--color-text)',
                marginBottom: '10px',
                letterSpacing: '-0.01em',
              }}>
                {m.title}
              </h3>

              <p style={{
                fontSize: '0.82rem',
                color: 'var(--color-text-muted)',
                lineHeight: 1.7,
                marginBottom: '20px',
              }}>
                {m.desc}
              </p>

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {m.tags.map((tag) => (
                  <span key={tag} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    fontWeight: 500,
                    letterSpacing: '0.04em',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    background: 'var(--color-surface-subtle)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-subtle)',
                  }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}