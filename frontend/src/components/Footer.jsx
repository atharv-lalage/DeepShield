// Footer.jsx — Clean, minimal footer
import React from 'react';
import { Shield, Github, ExternalLink } from 'lucide-react';

const COLS = [
  {
    heading: 'Navigate',
    links: [
      { label: 'Detect',       href: '#detect' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Modalities',   href: '#modalities' },
      { label: 'Benchmarks',   href: '#stats' },
    ],
  },
  {
    heading: 'Stack',
    links: [
      { label: 'React + Vite',   href: '#' },
      { label: 'Python / PyTorch', href: '#' },
      { label: 'Docker',         href: '#' },
    ],
  },
  {
    heading: 'Research',
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
    <footer style={{
      borderTop: '1px solid var(--color-border)',
      paddingTop: '56px',
      paddingBottom: '32px',
    }}>
      <div className="container">
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr',
          gap: '48px',
          marginBottom: '48px',
        }} className="footer-grid">

          {/* Brand */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{
                width: 30, height: 30, borderRadius: '7px',
                background: 'var(--color-text)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Shield size={15} color="var(--color-bg)" strokeWidth={2.5} />
              </div>
              <span style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                fontSize: '0.95rem',
                color: 'var(--color-text)',
              }}>
                DeepShield
              </span>
            </div>
            <p style={{
              fontSize: '0.82rem',
              color: 'var(--color-text-subtle)',
              lineHeight: 1.75,
              maxWidth: '280px',
              marginBottom: '20px',
            }}>
              AI-powered deepfake detection for researchers, journalists, and platform moderators.
              Final Year Engineering Project.
            </p>
            <a
              href="https://github.com/atharv-lalage/DeepShield"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '7px 14px',
                borderRadius: '8px',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-muted)',
                fontSize: '0.8rem',
                fontWeight: 500,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            >
              <Github size={14} />
              View on GitHub
            </a>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.heading}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                fontWeight: 500,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-text-subtle)',
                marginBottom: '16px',
              }}>
                {col.heading}
              </div>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      target={link.external ? '_blank' : undefined}
                      rel={link.external ? 'noopener noreferrer' : undefined}
                      style={{
                        fontSize: '0.84rem',
                        color: 'var(--color-text-muted)',
                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                        transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}
                    >
                      {link.label}
                      {link.external && <ExternalLink size={10} style={{ opacity: 0.5 }} />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '24px',
          borderTop: '1px solid var(--color-border)',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-subtle)' }}>
            © {year} DeepShield
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--color-text-subtle)',
          }}>
            For educational & research use only
          </span>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 480px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}