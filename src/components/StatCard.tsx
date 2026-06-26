import React from 'react';

interface StatCardProps {
  id?: string;
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  description?: string;
  trend?: {
    value: string;
    type: 'positive' | 'negative' | 'neutral';
  };
  className?: string;
  onClick?: () => void;
}

export default function StatCard({
  id,
  title,
  value,
  icon,
  description,
  trend,
  className = '',
  onClick
}: StatCardProps) {
  const isClickable = !!onClick;
  const cardId = id || `stat-card-${title.toLowerCase().replace(/\s+/g, '-')}`;
  
  return (
    <div
      id={cardId}
      onClick={onClick}
      className={`bg-slate-950 border border-slate-800 p-4.5 rounded-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-200 select-none ${
        isClickable 
          ? 'cursor-pointer hover:border-orange-500/60 hover:bg-slate-900/60 active:scale-[0.98]' 
          : ''
      } ${className}`}
    >
      {/* Decorative Glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/5 rounded-full blur-2xl pointer-events-none" />

      <div className="flex justify-between items-start">
        <div className="space-y-1.5 text-left">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block font-bold">
            {title}
          </span>
          <span className="text-2xl font-bold font-display text-white tracking-tight block">
            {value}
          </span>
        </div>
        {icon && (
          <div className="p-2 rounded-xl bg-slate-900 border border-slate-800/80 text-orange-500 shadow-inner">
            {icon}
          </div>
        )}
      </div>

      {(description || trend) && (
        <div className="flex items-center justify-between mt-3.5 pt-3 border-t border-slate-900/60 text-[11px] font-mono">
          {description && (
            <span className="text-slate-400 font-medium truncate max-w-[80%] text-left">
              {description}
            </span>
          )}
          {trend && (
            <span className={`font-semibold shrink-0 ml-auto ${
              trend.type === 'positive' ? 'text-emerald-400' :
              trend.type === 'negative' ? 'text-rose-400' :
              'text-slate-400'
            }`}>
              {trend.value}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
