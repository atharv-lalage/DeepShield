// Navbar.jsx — Top navigation bar
import React, { useState, useEffect } from 'react';
import { Shield, Zap, Menu, X } from 'lucide-react';

export default function Navbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Detect',       href: '#detect' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Modalities',   href: '#modalities' },
    { label: 'Stats',        href: '#stats' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease',
        background: scrolled ? 'rgba(5,8,16,0.85)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.07)' : '1px solid transparent',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '68px' }}>

        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'linear-gradient(135deg, #6366f1, #22d3ee)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(99,102,241,0.5)',
          }}>
            <Shield size={18} color="#fff" />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem',
            background: 'linear-gradient(90deg, #e2e8f0, #a5b4fc)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Project Xero
          </span>
        </a>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }} className="desktop-nav">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-muted)', transition: 'color 0.2s, background 0.2s' }}
              onMouseEnter={e => { e.target.style.color = 'var(--color-text)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { e.target.style.color = 'var(--color-text-muted)'; e.target.style.background = 'transparent'; }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA + mobile btn */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <a
            href="#detect"
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 20px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #6366f1, #818cf8)',
              color: '#fff', fontSize: '0.85rem', fontWeight: 600,
              boxShadow: '0 0 20px rgba(99,102,241,0.4)',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(99,102,241,0.6)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(99,102,241,0.4)'; }}
          >
            <Zap size={14} /> Try Free
          </a>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ display: 'none', background: 'none', color: 'var(--color-text)', padding: '6px', border: 'none', cursor: 'pointer' }}
            className="mobile-menu-btn"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{ background: 'rgba(5,8,16,0.96)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 24px 24px' }}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--color-text-muted)', fontSize: '0.95rem', fontWeight: 500 }}
            >
              {link.label}
            </a>
          ))}
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}
