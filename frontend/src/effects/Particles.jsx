// Particles.jsx — Floating ambient particle field
import React, { useEffect, useRef } from 'react';

const PARTICLE_COUNT = 60;

function randomBetween(a, b) {
  return a + Math.random() * (b - a);
}

export default function Particles() {
  const canvasRef = useRef(null);
  const stateRef  = useRef({ particles: [], animId: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W = canvas.width  = window.innerWidth;
    let H = canvas.height = window.innerHeight;

    // Initialize particles
    stateRef.current.particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x:     randomBetween(0, W),
      y:     randomBetween(0, H),
      r:     randomBetween(1, 2.5),
      vx:    randomBetween(-0.3, 0.3),
      vy:    randomBetween(-0.5, -0.1),
      alpha: randomBetween(0.15, 0.6),
      // color: accent purple or cyan
      color: Math.random() > 0.5 ? '99,102,241' : '34,211,238',
    }));

    function draw() {
      ctx.clearRect(0, 0, W, H);

      const ps = stateRef.current.particles;
      ps.forEach((p) => {
        // Drift
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around
        if (p.y < -4) { p.y = H + 4; p.x = randomBetween(0, W); }
        if (p.x < -4)   p.x = W + 4;
        if (p.x > W + 4) p.x = -4;

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color}, ${p.alpha})`;
        ctx.fill();
      });

      stateRef.current.animId = requestAnimationFrame(draw);
    }

    draw();

    const onResize = () => {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (stateRef.current.animId) cancelAnimationFrame(stateRef.current.animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
