import React, { useEffect, useState } from 'react';
import { BrandMark } from './BrandMark.tsx';

interface OpeningAnimationProps {
  logoUrl?: string;
  onComplete: () => void;
}

const PARTICLES = [
  { top: '16%', left: '16%', size: 7, delay: '0s' },
  { top: '20%', right: '14%', size: 6, delay: '0.5s' },
  { bottom: '18%', left: '18%', size: 6, delay: '0.9s' },
  { bottom: '16%', right: '16%', size: 8, delay: '1.3s' },
  { top: '6%', left: '50%', size: 6, delay: '0.3s' },
  { top: '50%', left: '4%', size: 5, delay: '1.1s' },
  { top: '52%', right: '4%', size: 6, delay: '0.7s' },
] as const;

export const OpeningAnimation = React.memo(function OpeningAnimation({
  logoUrl,
  onComplete,
}: OpeningAnimationProps) {
  const [phase, setPhase] = useState<'logo' | 'director' | 'tagline' | 'exit'>('logo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('director'), 1200);
    const t2 = setTimeout(() => setPhase('tagline'), 2700);
    const t3 = setTimeout(() => setPhase('exit'), 4500);
    const t4 = setTimeout(() => onComplete(), 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none transition-opacity duration-500 ease-in-out ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(circle at 50% 44%, rgba(14,165,233,0.18) 0%, rgba(15,23,42,0.92) 45%, #020617 100%)',
        willChange: 'opacity',
      }}
      aria-label="Opening Animation: The Zone of Chemistry"
    >
      {/* Orbiting chemistry atomic rings (100% GPU composited) */}
      <div className="relative flex items-center justify-center w-60 h-60 sm:w-72 sm:h-72">
        <div className="zoc-orbit absolute inset-2 rounded-full border border-sky-400/25">
          <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-sky-400" />
        </div>

        <div className="zoc-orbit-rev absolute inset-8 rounded-full border border-blue-400/30">
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-cyan-300" />
        </div>

        <div className="zoc-orbit-fast absolute inset-14 rounded-full border border-indigo-400/25">
          <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-400" />
        </div>

        {PARTICLES.map((p, idx) => (
          <span
            key={idx}
            style={{
              top: 'top' in p ? p.top : undefined,
              bottom: 'bottom' in p ? p.bottom : undefined,
              left: 'left' in p ? p.left : undefined,
              right: 'right' in p ? p.right : undefined,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
            }}
            className="zoc-particle absolute rounded-full bg-sky-300/80"
          />
        ))}

        {/* Logo mark */}
        <div className="relative z-10 flex flex-col items-center">
          <div className="p-3 rounded-2xl bg-slate-950/75 border border-sky-400/35">
            <BrandMark size={68} logoUrl={logoUrl} light />
          </div>
        </div>
      </div>

      {/* Institute Title & Sequence */}
      <div className="relative z-10 mt-2 text-center px-6 max-w-2xl">
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
          THE ZONE OF CHEMISTRY
        </h1>

        <p className="mt-1 text-xs sm:text-sm font-bold tracking-[0.26em] text-sky-400 uppercase">
          COACHING CENTER
        </p>

        <p
          className={`mt-3 text-base sm:text-xl font-bold tracking-wider text-sky-200 transition-all duration-500 ${
            phase !== 'logo' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          BY S. K. SRIVASTAV
        </p>

        <p
          className={`mt-2 text-xs sm:text-sm font-semibold tracking-[0.22em] text-slate-300 uppercase transition-all duration-500 ${
            phase === 'tagline' || phase === 'exit' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          LEARN • PRACTICE • EXCEL
        </p>
      </div>

      {/* Subtle 5-second progress bar */}
      <div className="absolute bottom-8 w-44 h-0.5 bg-slate-800 rounded-full overflow-hidden">
        <div className="zoc-progress-bar h-full bg-gradient-to-r from-blue-500 to-sky-400" />
      </div>
    </div>
  );
});
