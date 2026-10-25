// Navbar.jsx — Professional minimal nav
import React, { useState, useEffect } from 'react';
import { Shield, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Navbar() {
  const [scrolled,   setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks = [
    { label: 'Detect',       href: '#detect' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Modalities',   href: '#modalities' },
    { label: 'Benchmarks',   href: '#stats' },
  ];

  return (
    <nav style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 1000,
      transition: 'all 0.3s ease',
      background: scrolled ? 'var(--color-bg)' : 'transparent',
      backdropFilter: scrolled ? 'blur(24px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--color-border)' : '1px solid transparent',
    }}>
      <div className="container" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: '64px',
      }}>

        {/* Logo */}
        <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            background: 'var(--color-text)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={16} color="var(--color-bg)" strokeWidth={2.5} />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            fontSize: '1rem',
            letterSpacing: '-0.01em',
            color: 'var(--color-text)',
          }}>
            DeepShield
          </span>
        </a>

        {/* Desktop links */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }} className="desktop-nav">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: 'var(--color-text-muted)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.target.style.color = 'var(--color-text)'; e.target.style.background = 'var(--color-surface-subtle)'; }}
              onMouseLeave={e => { e.target.style.color = 'var(--color-text-muted)'; e.target.style.background = 'transparent'; }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Theme toggle */}
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 34, height: 34,
              borderRadius: '8px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.borderColor = 'var(--color-border-strong)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* GitHub CTA */}
          <a
            href="https://github.com/atharv-lalage/DeepShield"
            target="_blank" rel="noopener noreferrer"
            className="desktop-nav"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-strong)',
              color: 'var(--color-text)',
              fontSize: '0.82rem',
              fontWeight: 600,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-surface-raised)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-surface)'; }}
          >
            GitHub
          </a>

          {/* Mobile menu btn */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="mobile-menu-btn"
            style={{
              display: 'none',
              background: 'none',
              color: 'var(--color-text)',
              padding: '6px',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div style={{
          background: 'var(--color-bg)',
          borderTop: '1px solid var(--color-border)',
          padding: '12px 24px 20px',
        }}>
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{
                display: 'block',
                padding: '12px 0',
                borderBottom: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-muted)',
                fontSize: '0.92rem',
                fontWeight: 500,
              }}
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