import React from 'react';
import { ArrowRight, MapPin, Sun, Moon } from 'lucide-react';
import { KazifyLogo } from '../common/KazifyLogo';

interface HeroProps {
  darkMode: boolean;
  toggleTheme: () => void;
  onGetStarted: () => void;
}

export const Hero: React.FC<HeroProps> = ({ darkMode, toggleTheme, onGetStarted }) => {
  return (
    <header id="hero-header" role="banner" className={`relative text-white overflow-hidden border-b transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 border-orange-500/10' : 'bg-slate-900 border-orange-500/20'
    }`}>
      {/* Abstract background blobs */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400 via-blue-500 to-indigo-900"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 relative">
        {/* Nav */}
        <nav aria-label="Main Navigation" className="flex items-center justify-between mb-12">
          <div className="flex items-center space-x-3" tabIndex={0} aria-label="Kazify Logo">
            <KazifyLogo isDark={true} size="md" variant="horizontal" showTagline={true} />
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-300" />}
            </button>

            <button
              onClick={onGetStarted}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-orange-500/40 text-orange-400 hover:text-white hover:bg-orange-500/20 hover:border-orange-500 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              aria-label="Access Kazify Platform"
            >
              Access Platform
            </button>
          </div>
        </nav>

        {/* Hero Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-white">
              Reliable Local Tradespersons, <span className="text-orange-500">Safely in Escrow.</span>
            </h1>

            <p className="text-lg text-slate-300 leading-relaxed max-w-xl">
              Connect instantly with certified plumbers, electricians, mechanics, and builders in Kenya. Security backed by real-time M-Pesa escrow verification.
            </p>

            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
              <button
                onClick={onGetStarted}
                className="px-8 py-4 rounded-xl font-medium bg-orange-500 text-slate-950 hover:bg-orange-400 shadow-xl shadow-orange-500/20 active:translate-y-0.5 transition-all flex items-center justify-center space-x-2 group cursor-pointer"
              >
                <span>Find a Fundi Now</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <div className="flex items-center space-x-2 text-slate-300 justify-center">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span className="text-sm">Nairobi • Mombasa • Kisumu • Nakuru • Eldoret</span>
              </div>
            </div>
          </div>

          {/* Aesthetic Visual Side */}
          <div className="lg:col-span-5 relative">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <div className="flex space-x-1.5">
                  <span className="w-3 h-3 rounded-full bg-slate-800"></span>
                  <span className="w-3 h-3 rounded-full bg-slate-800"></span>
                  <span className="w-3 h-3 rounded-full bg-slate-800"></span>
                </div>
                <span className="text-xs font-mono text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20 font-medium">STK Push Active</span>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-gray-500">Service Request #1831</span>
                    <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-0.5 rounded-full">Instant Dispatch</span>
                  </div>
                  <span className="text-sm font-semibold text-white block">Toilet cistern replacement and leak fix</span>
                  <span className="text-xs text-slate-400 mt-1 block">Location: Westlands, Nairobi</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800/60 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-slate-950 font-bold font-display text-sm">
                      JO
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-white block">Joseph Otieno (Fundi)</span>
                      <span className="text-xs text-gray-400">Plumbing Spec • ⭐ 4.9 (42 jobs)</span>
                    </div>
                  </div>
                  <span className="text-sm font-mono text-emerald-400">KES 1,200</span>
                </div>

                <div className="rounded-xl bg-orange-500/10 border border-orange-500/30 p-4 leading-normal">
                  <span className="text-xs text-orange-400 font-bold block mb-1">Simulated Kenyan Mobile Money</span>
                  <p className="text-xs text-slate-300">Escrow wallet acts as a buffer holding funds safely until task satisfaction is checked on mobile.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
