// HowItWorks.jsx — Step-by-step pipeline explanation
import React from 'react';
import { Upload, Cpu, ScanEye, BarChart2, ChevronRight } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: <Upload size={24} />,
    title: 'Image Ingestion',
    desc: 'Upload any facial image via drag-and-drop or file picker. We accept JPG, PNG, WEBP and BMP.',
    color: '#6366f1',
  },
  {
    step: '02',
    icon: <Cpu size={24} />,
    title: 'Neural Analysis',
    desc: 'Our multi-modal model extracts facial landmarks, skin texture maps, frequency artifacts, and eye reflections.',
    color: '#22d3ee',
  },
  {
    step: '03',
    icon: <ScanEye size={24} />,
    title: 'Region Mapping',
    desc: 'Suspicious areas are located and bounding boxes assigned with semantic labels for each anomaly type.',
    color: '#a78bfa',
  },
  {
    step: '04',
    icon: <BarChart2 size={24} />,
    title: 'Report & Score',
    desc: 'A confidence score, verdict, and interactive visual explanation are returned instantly in the UI.',
    color: '#f59e0b',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section" style={{ position: 'relative', overflow: 'hidden' }}>
      <div className="orb orb-cyan" style={{ width: 400, height: 400, bottom: -100, left: -100, position: 'absolute' }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header">
          <div className="section-label"><ScanEye size={13} /> Pipeline</div>
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Four stages power every detection — from raw pixels to a fully explained verdict.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0', position: 'relative', flexWrap: 'wrap', justifyContent: 'center' }}>
          {STEPS.map((step, i) => (
            <React.Fragment key={step.step}>
              {/* Step card */}
              <div
                id={`step-${step.step}`}
                style={{
                  flex: '1 1 220px',
                  maxWidth: '260px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  padding: '32px 24px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  position: 'relative',
                  transition: 'all 0.3s',
                  animation: `fadeInUp 0.6s ${i * 0.12}s ease both`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = step.color + '44';
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = `0 24px 60px rgba(0,0,0,0.5), 0 0 40px ${step.color}20`;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Step number */}
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: step.color,
                  letterSpacing: '0.1em',
                  opacity: 0.8,
                }}>
                  {step.step}
                </div>

                {/* Icon */}
                <div style={{
                  width: 52, height: 52,
                  borderRadius: '14px',
                  background: `${step.color}18`,
                  border: `1px solid ${step.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: step.color,
                  boxShadow: `0 0 20px ${step.color}25`,
                }}>
                  {step.icon}
                </div>

                {/* Text */}
                <div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.05rem',
                    fontWeight: 700,
                    marginBottom: '8px',
                    color: 'var(--color-text)',
                  }}>
                    {step.title}
                  </h3>
                  <p style={{
                    fontSize: '0.83rem',
                    color: 'var(--color-text-muted)',
                    lineHeight: 1.65,
                  }}>
                    {step.desc}
                  </p>
                </div>

                {/* Bottom accent bar */}
                <div style={{
                  position: 'absolute', bottom: 0, left: '24px', right: '24px',
                  height: '2px', borderRadius: '99px',
                  background: `linear-gradient(90deg, ${step.color}, transparent)`,
                  opacity: 0.5,
                }} />
              </div>

              {/* Arrow connector */}
              {i < STEPS.length - 1 && (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  color: 'var(--color-border-strong)',
                  padding: '0 4px',
                  alignSelf: 'center',
                }}>
                  <ChevronRight size={20} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ textAlign: 'center', marginTop: '56px' }}>
          <a href="#detect" className="btn-primary">
            Start Detecting <Upload size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
