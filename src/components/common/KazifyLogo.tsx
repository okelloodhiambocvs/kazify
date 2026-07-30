import React from 'react';

interface KazifyLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'mark' | 'horizontal';
  isDark?: boolean;
  showTagline?: boolean;
}

export const KazifyLogo: React.FC<KazifyLogoProps> = ({
  className = '',
  size = 'md',
  variant = 'horizontal',
  isDark = true,
  showTagline = false
}) => {
  const sizeMap = {
    sm: { height: 26, markWidth: 26, textClass: 'text-xl' },
    md: { height: 34, markWidth: 34, textClass: 'text-2xl' },
    lg: { height: 44, markWidth: 44, textClass: 'text-3xl' },
    xl: { height: 56, markWidth: 56, textClass: 'text-4xl' },
  };

  const { height, markWidth, textClass } = sizeMap[size];

  // Vector Mark matching attached logo (Blue Roof Facet + Orange K Branch)
  const MarkIcon = () => (
    <svg
      viewBox="0 0 200 200"
      width={markWidth}
      height={height}
      className="shrink-0 transition-transform duration-200 hover:scale-105"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="kzBrandBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0066FF" />
          <stop offset="65%" stopColor="#0052D4" />
          <stop offset="100%" stopColor="#0A1128" />
        </linearGradient>

        <linearGradient id="kzBrandRoofCap" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#0052D4" />
          <stop offset="100%" stopColor="#0099FF" />
        </linearGradient>

        <linearGradient id="kzBrandOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF9900" />
          <stop offset="50%" stopColor="#FF7A00" />
          <stop offset="100%" stopColor="#E65100" />
        </linearGradient>
      </defs>

      {/* Blue House Roof Slope (Right) */}
      <path
        d="M 95 20 L 140 45 C 148 50 148 62 140 67 L 115 82 C 110 85 104 85 99 81 L 80 67 L 80 20 Z"
        fill="url(#kzBrandRoofCap)"
      />

      {/* Left Main Blue Vertical Shaft & Base Slope */}
      <path
        d="M 80 20 L 80 160 C 80 167 74 172 67 173 L 52 176 C 45 177 38 171 38 163 L 38 60 C 38 52 44 45 52 43 Z"
        fill="url(#kzBrandBlueGrad)"
      />

      {/* Shadow Inner Facet */}
      <path
        d="M 80 20 L 99 81 C 90 86 80 86 80 67 Z"
        fill="#040D21"
        opacity="0.3"
      />

      {/* Orange Diagonal Arm of K */}
      <path
        d="M 70 100 L 122 65 C 128 61 136 62 141 67 L 172 102 C 177 108 176 116 170 121 L 110 165 C 104 169 96 167 92 162 L 70 132 Z"
        fill="url(#kzBrandOrangeGrad)"
      />

      {/* Lower Extended Orange Leg */}
      <path
        d="M 88 122 L 165 185 C 172 191 176 199 176 208 L 176 212 L 128 212 C 120 212 112 208 106 202 L 70 162 Z"
        fill="url(#kzBrandOrangeGrad)"
      />
    </svg>
  );

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <MarkIcon />
      </div>
    );
  }

  return (
    <div className={`inline-flex flex-col ${className}`}>
      <div className="flex items-center space-x-2.5">
        <MarkIcon />
        <div className="flex flex-col">
          <div className="flex items-center">
            <span className={`font-display font-extrabold ${textClass} tracking-tight leading-none ${isDark ? 'text-white' : 'text-slate-950'}`}>
              <span className="text-orange-500">k</span>azify
            </span>
          </div>
          {showTagline && (
            <div className="flex items-center space-x-1.5 mt-1 text-[8.5px] font-mono tracking-widest font-bold uppercase text-slate-400">
              <span className="w-2.5 h-[1px] bg-orange-500/60"></span>
              <span>CONNECT</span>
              <span className="text-orange-500 font-bold">•</span>
              <span>EMPOWER</span>
              <span className="text-orange-500 font-bold">•</span>
              <span>GROW</span>
              <span className="w-2.5 h-[1px] bg-orange-500/60"></span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
