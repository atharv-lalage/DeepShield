// Modalities.jsx — Detection modality cards
import React, { useState } from 'react';
import { ScanEye, Cpu, Activity, Fingerprint, Layers, Waves } from 'lucide-react';

const MODALITIES = [
  {
    id: 'facial',
    icon: <ScanEye size={26} />,
    title: 'Facial Landmark Analysis',
    desc: 'Detects inconsistencies in 468 facial landmark positions — asymmetry, proportional deviations, and unnatural geometry typical of GAN outputs.',
    color: '#6366f1',
    tags: ['GAN Detection', 'Geometry', '468 Points'],
  },
  {
    id: 'texture',
    icon: <Fingerprint size={26} />,
    title: 'Skin Texture Analysis',
    desc: 'Micro-texture patterns invisible to the human eye are extracted via frequency domain analysis to identify synthetic skin generation signatures.',
    color: '#22d3ee',
    tags: ['Frequency', 'Pore Analysis', 'GAN Artifacts'],
  },
  {
    id: 'eye',
    icon: <Activity size={26} />,
    title: 'Eye Reflection Mapping',
    desc: 'Real eyes contain consistent, physically plausible light reflections. Deepfakes often produce specular anomalies and bilateral inconsistencies.',
    color: '#a78bfa',
    tags: ['Specular', 'Bilateral', 'Cornea Map'],
  },
  {
    id: 'frequency',
    icon: <Waves size={26} />,
    title: 'Frequency Domain',
    desc: 'CNN-based upsampling and GAN generation leave characteristic checkerboard artifacts in the DCT frequency spectrum of an image.',
    color: '#f59e0b',
    tags: ['DCT', 'FFT', 'CNN Patterns'],
  },
  {
    id: 'blending',
    icon: <Layers size={26} />,
    title: 'Blend Boundary Detection',
    desc: 'Identifies seams at facial boundaries where a synthetic face has been composited onto a real background — a core FaceSwap signature.',
    color: '#10b981',
    tags: ['FaceSwap', 'Seam', 'Alpha Matte'],
  },
  {
    id: 'compression',
    icon: <Cpu size={26} />,
    title: 'Compression Forensics',
    desc: 'Deepfakes inherit double-compression artifacts from the original video or image encoded through multiple generation and save cycles.',
    color: '#ec4899',
    tags: ['JPEG', 'Double-Comp', 'Block Artifacts'],
  },
];

export default function Modalities() {
  const [active, setActive] = useState(null);

  return (
    <section id="modalities" className="section" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="orb orb-purple" style={{ width: 500, height: 500, top: '20%', right: -200, position: 'absolute', opacity: 0.4 }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header">
          <div className="section-label"><Cpu size={13} /> Detection Modalities</div>
          <h2 className="section-title">Six Layers of Analysis</h2>
          <p className="section-subtitle">
            Every image is processed through six independent detection engines — each targeting a different deepfake signature.
          </p>
        </div>

        <div className="grid-3">
          {MODALITIES.map((m, i) => (
            <div
              key={m.id}
              id={`modality-${m.id}`}
              className="modality-card"
              onClick={() => setActive(active === m.id ? null : m.id)}
              style={{
                animation: `fadeInUp 0.6s ${i * 0.08}s ease both`,
                borderColor: active === m.id ? `${m.color}44` : undefined,
                boxShadow:   active === m.id ? `0 0 40px ${m.color}20` : undefined,
              }}
            >
              <div style={{
                width: 56, height: 56, borderRadius: '16px',
                background: `${m.color}18`, border: `1px solid ${m.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: m.color, marginBottom: '20px', boxShadow: `0 0 24px ${m.color}20`,
              }}>
                {m.icon}
              </div>

              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.0rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '10px' }}>
                {m.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.65, marginBottom: '16px' }}>
                {m.desc}
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {m.tags.map((tag) => (
                  <span key={tag} style={{
                    fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
                    padding: '3px 10px', borderRadius: '99px',
                    background: `${m.color}12`, border: `1px solid ${m.color}25`, color: m.color,
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
