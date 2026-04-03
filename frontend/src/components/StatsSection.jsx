// StatsSection.jsx — Animated stats / metrics section
import React, { useEffect, useRef, useState } from 'react';
import { TrendingUp, Clock, Globe, ShieldCheck } from 'lucide-react';

const STATS = [
  { icon: <ShieldCheck size={28} />, value: 97.4, suffix: '%',  label: 'Detection Accuracy',    sub: 'On FaceForensics++ benchmark', color: '#6366f1' },
  { icon: <Clock size={28} />,       value: 1.8,  suffix: 's',  label: 'Avg. Analysis Time',    sub: 'End-to-end per image',         color: '#22d3ee' },
  { icon: <TrendingUp size={28} />,  value: 99.1, suffix: '%',  label: 'Real-Face Precision',   sub: 'Zero false-positive rate',     color: '#10b981' },
  { icon: <Globe size={28} />,       value: 6,    suffix: '+',  label: 'Detection Modalities',  sub: 'Texture, geometry, frequency…', color: '#f59e0b' },
];

function AnimatedNumber({ target, suffix, color, shouldAnimate }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!shouldAnimate) return;
    const duration  = 1800;
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
    <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.2rem, 4vw, 3rem)', fontWeight: 800, color, textShadow: `0 0 30px ${color}60`, lineHeight: 1 }}>
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
    <section id="stats" ref={sectionRef} className="section" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 0%, rgba(99,102,241,0.04) 50%, transparent 100%)', pointerEvents: 'none' }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div className="section-header">
          <div className="section-label"><TrendingUp size={13} /> Benchmarks</div>
          <h2 className="section-title">Numbers That Matter</h2>
          <p className="section-subtitle">Validated on industry-standard benchmarks against leading deepfake generation methods.</p>
        </div>

        <div className="grid-4">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="stat-card" id={`stat-${i}`} style={{ animation: `fadeInUp 0.6s ${i * 0.1}s ease both` }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, transparent, ${stat.color}, transparent)`, opacity: 0.6 }} />

              <div style={{ width: 52, height: 52, borderRadius: '14px', background: `${stat.color}15`, border: `1px solid ${stat.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color, marginBottom: '20px' }}>
                {stat.icon}
              </div>

              <AnimatedNumber target={stat.value} suffix={stat.suffix} color={stat.color} shouldAnimate={animated} />
              <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-text)', marginTop: '8px', marginBottom: '4px' }}>{stat.label}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
