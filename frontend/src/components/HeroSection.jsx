// HeroSection.jsx — Landing hero with animated headline and CTA
import React from 'react';
import { Shield, ArrowRight, Cpu, Eye, Zap } from 'lucide-react';

const PILLS = [
  { icon: <Cpu size={13} />,  label: 'Neural Network Analysis' },
  { icon: <Eye size={13} />,  label: 'Visual Explainability' },
  { icon: <Zap size={13} />,  label: 'Real-Time Detection' },
];

export default function HeroSection() {
  return (
    <section id="hero" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', paddingTop: '80px' }}>

      {/* Background orbs */}
      <div className="orb orb-purple" style={{ width: 600, height: 600, top: -200, left: -200, position: 'absolute' }} />
      <div className="orb orb-cyan"   style={{ width: 400, height: 400, bottom: -100, right: -100, position: 'absolute' }} />
      <div className="orb orb-pink"   style={{ width: 300, height: 300, top: '30%', right: '20%', position: 'absolute' }} />

      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
      }} />

      <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '60px 24px' }}>

        {/* Badge */}
        <div style={{ marginBottom: '28px', animation: 'fadeInUp 0.6s ease both' }}>
          <span className="badge badge-accent"><Shield size={12} /> AI-Powered Deepfake Detection</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: 'var(--font-display)', fontSize: 'clamp(2.8rem, 7vw, 5.5rem)',
          fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em',
          marginBottom: '24px', animation: 'fadeInUp 0.7s 0.1s ease both',
        }}>
          Detect Deepfakes
          <br />
          <span className="text-gradient">Before They Spread</span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)', color: 'var(--color-text-muted)',
          maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.75,
          animation: 'fadeInUp 0.7s 0.2s ease both',
        }}>
          Upload any facial image and let Project Xero's neural pipeline analyze it
          for manipulation — with visual region-level explainability, confidence scoring,
          and heatmap overlays.
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', marginBottom: '44px', animation: 'fadeInUp 0.7s 0.3s ease both' }}>
          {PILLS.map((pill) => (
            <div key={pill.label} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 16px', borderRadius: '99px',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-muted)',
            }}>
              <span style={{ color: 'var(--color-accent)' }}>{pill.icon}</span>
              {pill.label}
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeInUp 0.7s 0.4s ease both' }}>
          <a href="#detect" className="btn-primary" style={{ fontSize: '1rem', padding: '14px 32px' }}>
            Analyze an Image <ArrowRight size={18} />
          </a>
          <a href="#how-it-works" className="btn-secondary" style={{ fontSize: '1rem', padding: '14px 32px' }}>
            How It Works
          </a>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '48px', justifyContent: 'center', marginTop: '72px', flexWrap: 'wrap', animation: 'fadeInUp 0.7s 0.5s ease both' }}>
          {[
            { value: '97.4%', label: 'Detection Accuracy' },
            { value: '<2s',   label: 'Avg. Analysis Time' },
            { value: '6+',    label: 'Detection Modalities' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                lineHeight: 1, marginBottom: '6px',
              }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicator */}
        <div style={{ marginTop: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', animation: 'fadeIn 1s 1s ease both', opacity: 0.5 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-subtle)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Scroll to explore</span>
          <div style={{ width: '1px', height: '40px', background: 'linear-gradient(to bottom, var(--color-accent), transparent)' }} />
        </div>
      </div>
    </section>
  );
}
