import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Helmet } from '../Helmet';
import { Hero } from './Hero';
import { Features } from './Features';
import { HowItWorks } from './HowItWorks';
import { FAQ } from './FAQ';
import { CTA } from './CTA';

export interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  return (
    <div id="landing-container" className={`min-height-screen flex flex-col font-sans transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
    }`}>
      <Helmet 
        title="Local Tradespersons & Escrow" 
        description="Kazify connects you with vetted local handymen (Fundis) in Kenya. Secure payments held safely in M-Pesa escrow and fair budget estimations powered by Gemini AI."
      />
      
      {/* Hero Header */}
      <Hero 
        darkMode={darkMode} 
        toggleTheme={toggleTheme} 
        onGetStarted={onGetStarted} 
      />

      {/* Categories & Specific Services Section */}
      <Features 
        darkMode={darkMode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        onGetStarted={onGetStarted}
      />

      {/* Value Proposition */}
      <HowItWorks darkMode={darkMode} />

      {/* FAQs */}
      <FAQ darkMode={darkMode} />

      {/* Footer & Footer Modal */}
      <CTA darkMode={darkMode} />
    </div>
  );
}
