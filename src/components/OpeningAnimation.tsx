import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandMark } from './BrandMark.tsx';

interface OpeningAnimationProps {
  logoUrl?: string;
  onComplete: () => void;
}

export const OpeningAnimation = React.memo(function OpeningAnimation({
  logoUrl,
  onComplete,
}: OpeningAnimationProps) {
  const [phase, setPhase] = useState<'logo' | 'director' | 'tagline' | 'exit'>('logo');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('director'), 1300);
    const t2 = setTimeout(() => setPhase('tagline'), 2900);
    const t3 = setTimeout(() => setPhase('exit'), 4500);
    const t4 = setTimeout(() => onComplete(), 5000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  const particles = [
    { x: -160, y: -90, r: 4, d: 3.6 },
    { x: 175, y: -70, r: 3, d: 4.1 },
    { x: -130, y: 110, r: 3.5, d: 3.9 },
    { x: 150, y: 95, r: 4.5, d: 4.3 },
    { x: 0, y: -150, r: 3, d: 3.4 },
    { x: -200, y: 15, r: 2.5, d: 4.5 },
    { x: 205, y: 20, r: 3, d: 3.8 },
    { x: 80, y: 145, r: 3.5, d: 4.0 },
    { x: -85, y: -140, r: 2.8, d: 4.2 },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: phase === 'exit' ? 0 : 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden select-none"
        style={{
          background: 'linear-gradient(135deg, #020617 0%, #091734 52%, #030712 100%)',
        }}
        aria-label="Opening Animation: The Zone of Chemistry"
      >
        {/* Subtle radial glow (without expensive blur filter) */}
        <div
          className="pointer-events-none absolute w-[520px] h-[520px] rounded-full opacity-55"
          style={{
            background:
              'radial-gradient(circle, rgba(14,165,233,0.28) 0%, rgba(30,64,175,0.12) 45%, transparent 72%)',
          }}
        />

        {/* Orbiting chemistry atomic rings */}
        <div className="relative flex items-center justify-center w-60 h-60 sm:w-76 sm:h-76">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-2 rounded-full border border-sky-400/25"
            style={{ transformOrigin: 'center' }}
          >
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-sky-400 shadow-[0_0_14px_#38bdf8]" />
          </motion.div>

          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-8 rounded-full border border-blue-400/30"
            style={{ transform: 'rotateX(65deg) rotateY(22deg)' }}
          >
            <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_#67e8f9]" />
          </motion.div>

          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 7.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-14 rounded-full border border-indigo-400/25"
          >
            <span className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-blue-400 shadow-[0_0_10px_#60a5fa]" />
          </motion.div>

          {/* Floating chemistry particles */}
          {particles.map((p, idx) => (
            <motion.span
              key={idx}
              initial={{ opacity: 0, x: p.x * 0.6, y: p.y * 0.6, scale: 0.5 }}
              animate={{
                opacity: [0.2, 0.9, 0.2],
                x: [p.x * 0.85, p.x, p.x * 0.9],
                y: [p.y * 0.85, p.y - 12, p.y * 0.9],
                scale: [0.8, 1.15, 0.8],
              }}
              transition={{ duration: p.d, repeat: Infinity, ease: 'easeInOut' }}
              style={{ width: p.r * 2, height: p.r * 2 }}
              className="absolute rounded-full bg-sky-300/80 shadow-[0_0_10px_rgba(56,189,248,0.8)]"
            />
          ))}

          {/* Cinematic logo reveal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.72 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-sky-400/30 shadow-[0_0_40px_rgba(14,165,233,0.28)]">
              <BrandMark size={68} logoUrl={logoUrl} light />
            </div>
          </motion.div>
        </div>

        {/* Institute Title & Sequence */}
        <div className="relative z-10 mt-2 text-center px-6 max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white"
          >
            THE ZONE OF CHEMISTRY
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.65 }}
            className="mt-1 text-xs sm:text-sm font-bold tracking-[0.26em] text-sky-400 uppercase"
          >
            COACHING CENTER
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: phase !== 'logo' ? 1 : 0, y: phase !== 'logo' ? 0 : 10 }}
            transition={{ duration: 0.6 }}
            className="mt-3 text-base sm:text-xl font-bold tracking-wider text-sky-200"
          >
            BY S. K. SRIVASTAV
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: phase === 'tagline' || phase === 'exit' ? 1 : 0, y: phase === 'tagline' || phase === 'exit' ? 0 : 10 }}
            transition={{ duration: 0.6 }}
            className="mt-2 text-xs sm:text-sm font-semibold tracking-[0.22em] text-slate-300 uppercase"
          >
            LEARN • PRACTICE • EXCEL
          </motion.p>
        </div>

        {/* Subtle 5-second progress bar */}
        <div className="absolute bottom-8 w-44 h-0.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 4.8, ease: 'linear' }}
            style={{ transformOrigin: 'left' }}
            className="h-full bg-gradient-to-r from-blue-500 to-sky-400"
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
});
