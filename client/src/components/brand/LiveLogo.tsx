import React from 'react';

interface LiveLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const LiveLogo: React.FC<LiveLogoProps> = ({
  size = 'md',
  showTagline = false,
  className = '',
}) => {
  const sizeMap = {
    sm: { icon: 20, text: 'text-lg', badge: 'text-[9px] px-1 py-0.2' },
    md: { icon: 26, text: 'text-2xl', badge: 'text-[10px] px-1.5 py-0.5' },
    lg: { icon: 36, text: 'text-3xl', badge: 'text-xs px-2 py-0.5' },
    xl: { icon: 48, text: 'text-5xl', badge: 'text-sm px-2.5 py-1' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="flex items-center gap-2.5 select-none">
        {/* Refined LIVE Emblem */}
        <div className="relative flex items-center justify-center">
          <svg
            width={currentSize.icon}
            height={currentSize.icon}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="transform transition-transform duration-300 hover:scale-105"
          >
            {/* Outer Dark Graphite Container */}
            <rect width="100" height="100" rx="22" fill="#15171a" />
            <rect width="98" height="98" x="1" y="1" rx="21" stroke="#26292e" strokeWidth="2" />
            
            {/* Pulse Wave Ring */}
            <circle
              cx="50"
              cy="50"
              r="28"
              stroke="#e04f38"
              strokeWidth="3.5"
              strokeOpacity="0.4"
            />

            {/* Core Live Coral Node */}
            <circle cx="50" cy="50" r="15" fill="#e04f38" />
          </svg>
        </div>

        {/* Brand Wordmark */}
        <div className="flex items-center gap-1.5">
          <span
            className={`font-heading font-extrabold tracking-tight ${currentSize.text} text-zinc-900 dark:text-zinc-100 leading-none`}
          >
            LIVE
          </span>
          <span
            className={`font-semibold uppercase tracking-wider rounded bg-[#e04f38]/15 text-[#e04f38] ${currentSize.badge} border border-[#e04f38]/25`}
          >
            Stream
          </span>
        </div>
      </div>

      {showTagline && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium tracking-wide mt-1 pl-1">
          Everything happens live.
        </span>
      )}
    </div>
  );
};
