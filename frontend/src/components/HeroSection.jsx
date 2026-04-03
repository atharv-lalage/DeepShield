// HeroSection.jsx — Professional, clean hero
import React from 'react';
import { ArrowRight, ShieldCheck, Zap, ScanEye } from 'lucide-react';

const FEATURES = [
  { icon: <ShieldCheck size={14} />, label: '97.4% Detection Accuracy' },
  { icon: <Zap size={14} />,         label: 'Sub-2s Analysis' },
  { icon: <ScanEye size={14} />,     label: '6 Detection Modalities' },
];

export default function HeroSection() {
  return (
    <section
      id="hero"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '80px',
      }}
    >
      {/* Subtle grid background */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(var(--color-border-subtle) 1px, transparent 1px),
          linear-gradient(90deg, var(--color-border-subtle) 1px, transparent 1px)
        `,
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse 70% 80% at 20% 50%, black 20%, transparent 80%)',
      }} />

      {/* Noise-style fade at bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: '200px', pointerEvents: 'none',
        background: 'linear-gradient(to bottom, transparent, var(--color-bg))',
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1, paddingTop: '60px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '720px' }}>

          {/* Eyebrow label */}
          <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.5s ease both' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              fontWeight: 500,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-text-subtle)',
              padding: '5px 12px',
              borderRadius: '999px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface-subtle)',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: 'var(--color-real)',
                boxShadow: '0 0 6px var(--color-real)',
                display: 'inline-block',
              }} />
              Neural Deepfake Detection — Project Xero
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.8rem, 6vw, 5rem)',
            fontWeight: 600,
            lineHeight: 1.06,
            letterSpacing: '-0.035em',
            color: 'var(--color-text)',
            marginBottom: '28px',
            animation: 'fadeInUp 0.55s 0.08s ease both',
          }}>
            Detect synthetic media<br />
            <span style={{ color: 'var(--color-text-muted)' }}>before it causes harm.</span>
          </h1>

          {/* Body */}
          <p style={{
            fontSize: '1.05rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.75,
            maxWidth: '540px',
            marginBottom: '40px',
            animation: 'fadeInUp 0.55s 0.16s ease both',
          }}>
            Upload any image or video. DeepShield's multi-modal neural pipeline analyses
            facial landmarks, frequency artifacts, eye reflections, and blend seams —
            returning a confidence score, region heatmap, and forensic report.
          </p>

          {/* Feature pills */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '8px',
            marginBottom: '40px',
            animation: 'fadeInUp 0.55s 0.22s ease both',
          }}>
            {FEATURES.map((f) => (
              <span key={f.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '6px 14px',
                borderRadius: '999px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                fontSize: '0.8rem',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
              }}>
                <span style={{ color: 'var(--color-text-subtle)' }}>{f.icon}</span>
                {f.label}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap',
            animation: 'fadeInUp 0.55s 0.28s ease both',
          }}>
            <button
              className="btn-primary"
              onClick={() => document.getElementById('detect')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Analyse a File <ArrowRight size={16} />
            </button>
            <a href="#how-it-works" className="btn-secondary">
              How it works
            </a>
          </div>
        </div>



        {/* Scroll cue */}
        <div style={{
          marginTop: '56px',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px',
          animation: 'fadeIn 1s 0.8s ease both', opacity: 0,
        }}>
          <div style={{ width: '1px', height: '36px', background: 'linear-gradient(to bottom, var(--color-border-strong), transparent)' }} />
        </div>
      </div>

      {/* Responsive stat strip */}
      <style>{`
        @media (max-width: 768px) {
          .hero-stats { flex-direction: column !important; gap: 24px !important; }
          .hero-stats > div { border-right: none !important; border-bottom: 1px solid var(--color-border); padding: 16px 0 !important; }
          .hero-stats > div:last-child { border-bottom: none; }
        }
      `}</style>
    </section>
  );
}