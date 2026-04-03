// Footer.jsx — Site footer
import React from 'react';
import { Shield, Github, Twitter, ExternalLink } from 'lucide-react';

const COLS = [
  {
    heading: 'Product',
    links: [
      { label: 'Detect',       href: '#detect' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Modalities',   href: '#modalities' },
      { label: 'Benchmarks',   href: '#stats' },
    ],
  },
  {
    heading: 'Tech Stack',
    links: [
      { label: 'React + Vite',   href: '#' },
      { label: 'Python Backend', href: '#' },
      { label: 'PyTorch Models', href: '#' },
      { label: 'Docker',         href: '#' },
    ],
  },
  {
    heading: 'Resources',
    links: [
      { label: 'FaceForensics++', href: 'https://github.com/ondyari/FaceForensics', external: true },
      { label: 'DeepFaceLab',     href: 'https://github.com/iperov/DeepFaceLab',   external: true },
      { label: 'DFDC Dataset',    href: 'https://dfdc.ai',                          external: true },
    ],
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer style={{ position: 'relative', paddingTop: '64px', paddingBottom: '32px', borderTop: '1px solid var(--color-border)', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent, rgba(99,102,241,0.03))', pointerEvents: 'none' }} />

      <div className="container" style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '48px', marginBottom: '56px' }} className="footer-grid">

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #22d3ee)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                <Shield size={18} color="#fff" />
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem', background: 'linear-gradient(90deg, #e2e8f0, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Project Xero
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-subtle)', lineHeight: 1.75, maxWidth: '300px', marginBottom: '24px' }}>
              AI-powered deepfake detection for researchers, journalists, and platform moderators. Built at PICT for PVG Hackathon.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {[
                { icon: <Github size={16} />, href: 'https://github.com/Samarth1542005/Project-Xero-PICT', label: 'GitHub' },
                { icon: <Twitter size={16} />, href: '#', label: 'Twitter' },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{ width: 36, height: 36, borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', transition: 'all 0.2s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.15)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.35)'; e.currentTarget.style.color = '#a5b4fc'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.heading}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-subtle)', marginBottom: '16px' }}>
                {col.heading}
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      style={{ fontSize: '0.855rem', color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                    >
                      {link.label}
                      {link.external && <ExternalLink size={11} style={{ opacity: 0.6 }} />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-text-subtle)' }}>© {year} Project Xero · PICT Pune</span>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-subtle)' }}>Built for PVG Hackathon 2025 · For educational & research use</span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
