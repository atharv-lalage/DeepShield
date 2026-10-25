// StatsSection.jsx — Minimal benchmark metrics
import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, Clock, Globe, ShieldCheck } from 'lucide-react';

const STATS = [
  {
    icon: <ShieldCheck size={16} />,
    value: 97.4, suffix: '%',
    label: 'Detection Accuracy',
    sub: 'FaceForensics++ benchmark',
  },
  {
    icon: <Clock size={16} />,
    value: 1.8, suffix: 's',
    label: 'Analysis Time',
    sub: 'End-to-end per image',
  },
  {
    icon: <TrendingUp size={16} />,
    value: 99.1, suffix: '%',
    label: 'Real-Face Precision',
    sub: 'Zero false-positive rate',
  },
  {
    icon: <Globe size={16} />,
    value: 6, suffix: '+',
    label: 'Detection Modalities',
    sub: 'Run in parallel per file',
  },
];

function AnimatedNumber({ target, suffix, shouldAnimate }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) return;
    const duration  = 1600;
    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = target * eased;
      setDisplay(target % 1 === 0 ? Math.round(current) : parseFloat(current.toFixed(1)));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [shouldAnimate, target]);

  return (
    <span style={{
      fontFamily: 'var(--font-display)',
      fontSize: 'clamp(2rem, 3.5vw, 2.8rem)',
      fontWeight: 600,
      letterSpacing: '-0.03em',
      color: 'var(--color-text)',
      lineHeight: 1,
    }}>
      {display}{suffix}
    </span>
  );
}

export default function StatsSection() {
  const sectionRef = useRef(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setAnimated(true); observer.disconnect(); } },
      { threshold: 0.25 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="stats"
      ref={sectionRef}
      className="section"
      style={{ borderTop: '1px solid var(--color-border)' }}
    >
      <div className="container">

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '56px',
          flexWrap: 'wrap',
          gap: '24px',
        }}>
          <div>
            <div className="section-label"><TrendingUp size={11} /> Benchmarks</div>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Numbers that matter</h2>
          </div>
          <p style={{
            fontSize: '0.875rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.7,
            maxWidth: '360px',
          }}>
            Validated on industry-standard datasets against leading deepfake generation methods including
            Deepfakes, FaceSwap, Face2Face, and NeuralTextures.
          </p>
        </div>

        {/* Stats in a row divided by vertical lines */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0',
          borderTop: '1px solid var(--color-border)',
          borderLeft: '1px solid var(--color-border)',
        }}>
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                padding: '40px 32px',
                borderRight: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
                animation: `fadeInUp 0.5s ${i * 0.1}s ease both`,
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--color-text-subtle)',
                marginBottom: '20px',
                fontSize: '0.75rem',
                fontWeight: 500,
              }}>
                {stat.icon}
                <span>{stat.label}</span>
              </div>

              <AnimatedNumber
                target={stat.value}
                suffix={stat.suffix}
                shouldAnimate={animated}
              />

              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.68rem',
                color: 'var(--color-text-subtle)',
                marginTop: '10px',
                letterSpacing: '0.02em',
              }}>
                {stat.sub}
              </div>
            </div>
          ))}
        </div>

        <style>{`
          @media (max-width: 768px) {
            #stats .container > div:last-child {
              grid-template-columns: repeat(2, 1fr) !important;
            }
          }
          @media (max-width: 480px) {
            #stats .container > div:last-child {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </section>
  );
}