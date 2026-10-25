// HowItWorks.jsx — Clean pipeline steps
import React from 'react';
import { Upload, Cpu, ScanEye, BarChart2, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    num: '01',
    icon: <Upload size={20} />,
    title: 'Media Ingestion',
    desc: 'Drag-and-drop one or more files. Supports images (JPEG, PNG, WebP) and video frames.',
  },
  {
    num: '02',
    icon: <Cpu size={20} />,
    title: 'Neural Analysis',
    desc: 'Six detection engines run in parallel — landmarks, skin texture, eye reflections, frequency artifacts.',
  },
  {
    num: '03',
    icon: <ScanEye size={20} />,
    title: 'Region Mapping',
    desc: 'Suspicious areas are localised. Bounding boxes with semantic labels mark each anomaly type.',
  },
  {
    num: '04',
    icon: <BarChart2 size={20} />,
    title: 'Report & Score',
    desc: 'A confidence score, verdict, and interactive visual explanation are returned in under two seconds.',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section" style={{ borderTop: '1px solid var(--color-border)' }}>
      <div className="container">

        <div style={{ display: 'flex', gap: '64px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Left — header */}
          <div style={{ flex: '0 0 300px', minWidth: 0 }}>
            <div className="section-label">Pipeline</div>
            <h2 className="section-title">How DeepShield works</h2>
            <p className="section-subtitle">
              Four deterministic stages power every analysis — from raw pixels to a fully explained, auditable verdict.
            </p>
            <div style={{ marginTop: '32px' }}>
              <a href="#detect" className="btn-primary" style={{ fontSize: '0.85rem', padding: '11px 22px' }}>
                Try it now <ArrowRight size={14} />
              </a>
            </div>
          </div>

          {/* Right — steps */}
          <div style={{ flex: '1 1 400px', minWidth: 0 }}>
            {STEPS.map((step, i) => (
              <div
                key={step.num}
                style={{
                  display: 'flex',
                  gap: '24px',
                  paddingBottom: i < STEPS.length - 1 ? '0' : '0',
                  position: 'relative',
                  animation: `fadeInUp 0.5s ${i * 0.1}s ease both`,
                }}
              >
                {/* Left gutter — number + line */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  flexShrink: 0,
                }}>
                  <div style={{
                    width: 44, height: 44,
                    borderRadius: '10px',
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    flexShrink: 0,
                  }}>
                    {step.icon}
                  </div>
                  {i < STEPS.length - 1 && (
                    <div style={{
                      width: 1,
                      flex: 1,
                      minHeight: 32,
                      background: 'var(--color-border)',
                      margin: '8px 0',
                    }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ paddingBottom: i < STEPS.length - 1 ? '32px' : '0' }}>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.1em',
                    color: 'var(--color-text-subtle)',
                    textTransform: 'uppercase',
                    marginBottom: '6px',
                  }}>
                    Step {step.num}
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.0rem',
                    fontWeight: 600,
                    color: 'var(--color-text)',
                    marginBottom: '8px',
                    letterSpacing: '-0.01em',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.7,
                  }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @media (max-width: 768px) {
            #how-it-works .container > div { flex-direction: column; gap: 40px; }
          }
        `}</style>
      </div>
    </section>
  );
}