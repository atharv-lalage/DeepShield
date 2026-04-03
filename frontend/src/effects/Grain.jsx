// Grain.jsx — Film grain overlay effect for premium cinematic feel
import React, { useEffect, useRef } from 'react';

export default function Grain({ opacity = 0.035, animated = true }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w = canvas.width  = window.innerWidth;
    let h = canvas.height = window.innerHeight;

    function drawGrain() {
      const imageData = ctx.createImageData(w, h);
      const data      = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const v = (Math.random() * 255) | 0;
        data[i]     = v;
        data[i + 1] = v;
        data[i + 2] = v;
        data[i + 3] = (Math.random() * 40) | 0; // low alpha
      }

      ctx.putImageData(imageData, 0, 0);

      if (animated) {
        animRef.current = requestAnimationFrame(drawGrain);
      }
    }

    drawGrain();

    const onResize = () => {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      if (!animated) drawGrain();
    };

    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [animated]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
        opacity,
      }}
      aria-hidden="true"
    />
  );
}
