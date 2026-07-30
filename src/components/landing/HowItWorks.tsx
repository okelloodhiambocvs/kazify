import React from 'react';
import { ShieldCheck, Star, Clock } from 'lucide-react';

interface HowItWorksProps {
  darkMode: boolean;
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ darkMode }) => {
  const valueProps = [
    {
      title: 'M-Pesa Escrow Wallet',
      description: 'Your payment is processed via safe M-Pesa STK push & held securely in escrow. Fundi receives money only after you approve completion.',
      icon: ShieldCheck,
    },
    {
      title: 'Vetted Local Fundis',
      description: 'National Industrial Training Authority (NITA) and identity checked skilled experts across Kenyan neighborhoods.',
      icon: Star,
    },
    {
      title: 'Uber-Style Matching',
      description: 'Emergency plumber? Get matched instantly to nearest available tradespersons in major towns across Kenya.',
      icon: Clock,
    },
  ];

  return (
    <section id="value" className={`py-16 border-y transition-colors duration-300 ${
      darkMode ? 'bg-slate-900/40 border-slate-900' : 'bg-white border-slate-200/80'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {valueProps.map((prop, idx) => {
            const Icon = prop.icon;
            return (
              <div key={idx} className="space-y-3 p-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className={`font-display font-bold text-lg transition-colors duration-300 ${
                  darkMode ? 'text-white' : 'text-slate-900'
                }`}>{prop.title}</h3>
                <p className={`leading-relaxed text-sm transition-colors duration-300 ${
                  darkMode ? 'text-slate-400' : 'text-slate-500'
                }`}>{prop.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
