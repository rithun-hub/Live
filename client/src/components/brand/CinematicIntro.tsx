import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CinematicIntroProps {
  onComplete: () => void;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<number>(0);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      onComplete();
      return;
    }

    // Sequence stages:
    // 0: Deep background display (0ms)
    // 1: Reveal logo & wordmark (400ms)
    // 2: Reveal tagline (1400ms)
    // 3: Complete transition (2700ms)
    const t1 = setTimeout(() => setStage(1), 350);
    const t2 = setTimeout(() => setStage(2), 1250);
    const t3 = setTimeout(() => {
      setStage(3);
      setTimeout(() => {
        sessionStorage.setItem('live_intro_seen', 'true');
        onComplete();
      }, 500);
    }, 2600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  const handleSkip = () => {
    sessionStorage.setItem('live_intro_seen', 'true');
    onComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: stage === 3 ? 0 : 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0d0e] select-none"
    >
      {/* Skip Button */}
      <button
        onClick={handleSkip}
        className="absolute top-6 right-8 text-xs font-medium text-zinc-500 hover:text-zinc-300 transition-colors uppercase tracking-widest px-3 py-1.5 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60"
      >
        Skip Intro
      </button>

      <div className="flex flex-col items-center justify-center text-center px-4">
        {/* Animated LIVE Emblem */}
        <AnimatePresence>
          {stage >= 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-4 mb-4"
            >
              {/* Refined Brand Symbol */}
              <div className="relative flex items-center justify-center">
                <svg
                  width="54"
                  height="54"
                  viewBox="0 0 100 100"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect width="100" height="100" rx="22" fill="#15171a" />
                  <rect width="98" height="98" x="1" y="1" rx="21" stroke="#26292e" strokeWidth="2" />
                  
                  {/* Subtle Expanding Ripple */}
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="28"
                    stroke="#e04f38"
                    strokeWidth="3.5"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.4] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  />

                  {/* Active Coral Node */}
                  <circle cx="50" cy="50" r="15" fill="#e04f38" />
                </svg>
              </div>

              {/* Bold Minimal LIVE Wordmark */}
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
                className="font-heading font-black tracking-tight text-5xl text-zinc-100"
              >
                LIVE
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tagline Reveal */}
        <AnimatePresence>
          {stage >= 2 && (
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-sm font-medium tracking-widest uppercase text-zinc-400 font-sans"
            >
              Everything happens live.
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
