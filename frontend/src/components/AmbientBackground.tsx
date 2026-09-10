// ============================================================
// CodeQuest — Subtle Ambient Background Particles
// ============================================================

import React, { useState, useEffect } from 'react';

interface Particle {
  id: number;
  symbol: string;
  left: number; // percentage
  top: number;  // percentage
  size: number; // font size in rem
  duration: number; // animation duration in seconds
  delay: number; // animation delay in seconds
  opacity: number;
}

const SYMBOLS = [
  '✨', '⭐', '</>', '✦', '{ }', '◇', '✨', '01', '○', '=>', '⭐', '✦'
];

export default function AmbientBackground() {
  const [enabled, setEnabled] = useState(() => {
    const saved = localStorage.getItem('codequest_ambient_enabled');
    return saved === null ? true : saved === 'true';
  });

  // Generate stable particle positions once
  const [particles] = useState<Particle[]>(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      symbol: SYMBOLS[i % SYMBOLS.length],
      left: 4 + (i * 8.2) + (Math.sin(i) * 3), // well-distributed across width
      top: 8 + ((i * 17) % 80),               // distributed across height
      size: 0.9 + (i % 3) * 0.35,              // between 0.9rem and 1.6rem
      duration: 18 + (i % 5) * 4,              // 18s to 34s very slow, calming drift
      delay: (i * 1.7) % 8,                    // staggered phase
      opacity: 0.10 + (i % 4) * 0.03,          // very soft 0.10 - 0.19 opacity
    }));
  });

  useEffect(() => {
    const handleToggle = (e: CustomEvent<{ enabled: boolean }>) => {
      setEnabled(e.detail.enabled);
    };

    window.addEventListener('codequest_ambient_toggle' as any, handleToggle);
    return () => {
      window.removeEventListener('codequest_ambient_toggle' as any, handleToggle);
    };
  }, []);

  if (!enabled) return null;

  return (
    <div
      className="ambient-background-layer"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {particles.map((p) => (
        <div
          key={p.id}
          className="ambient-particle"
          style={{
            position: 'absolute',
            left: `${p.left}%`,
            top: `${p.top}%`,
            fontSize: `${p.size}rem`,
            opacity: p.opacity,
            animationDuration: `${p.duration}s`,
            animationDelay: `-${p.delay}s`,
          }}
        >
          {p.symbol}
        </div>
      ))}
    </div>
  );
}
