import React from 'react';

interface BrandMarkProps {
  size?: number;
  logoUrl?: string;
  light?: boolean;
}

export function BrandMark({ size = 36, logoUrl, light = false }: BrandMarkProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt="THE ZONE OF CHEMISTRY logo"
        referrerPolicy="no-referrer"
        style={{ width: size, height: size }}
        className="rounded-lg object-cover shrink-0 border border-slate-200/30"
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="10"
        fill={light ? 'rgba(255,255,255,0.08)' : '#0B1528'}
        stroke={light ? 'rgba(56,189,248,0.45)' : '#1E40AF'}
        strokeWidth="1.5"
      />
      {/* Benzene hexagon ring */}
      <polygon
        points="24,10 35,16.5 35,29.5 24,36 13,29.5 13,16.5"
        stroke="#38BDF8"
        strokeWidth="2"
        fill="none"
      />
      {/* Inner aromatic resonance circle */}
      <circle cx="24" cy="23" r="6.5" stroke="#60A5FA" strokeWidth="1.5" strokeDasharray="3 2" />
      {/* Nucleus atom */}
      <circle cx="24" cy="23" r="2.6" fill="#FFFFFF" />
      {/* Orbital nodes */}
      <circle cx="24" cy="10" r="2" fill="#38BDF8" />
      <circle cx="35" cy="29.5" r="2" fill="#38BDF8" />
      <circle cx="13" cy="29.5" r="2" fill="#38BDF8" />
    </svg>
  );
}
