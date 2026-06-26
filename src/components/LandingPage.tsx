import React, { useState } from 'react';
import { Hammer, Zap, Droplet, Shield, Sparkles, Car, Leaf, ArrowRight, Star, Clock, ShieldCheck, MapPin, ChevronDown, Sun, Moon, Search } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import FooterModal from './FooterModal';
import { Helmet } from './Helmet';

interface FAQItem {
  question: string;
  answer: string;
}

interface ServiceItem {
  name: string;
  category: string;
  priceEstimate: string;
  duration: string;
  keywords: string[];
}

const SPECIFIC_SERVICES: ServiceItem[] = [
  { name: 'Leaking Pipe Repair', category: 'Plumbing', priceEstimate: 'KES 800 - 1,500', duration: '1-2 hrs', keywords: ['pipe', 'leak', 'toilet', 'tap', 'water', 'sink', 'plumber', 'drain'] },
  { name: 'Drain & Sewer Unblocking', category: 'Plumbing', priceEstimate: 'KES 1,200 - 2,500', duration: '2-3 hrs', keywords: ['drain', 'clog', 'sink', 'unblock', 'sewer', 'plumber'] },
  { name: 'Water Tank & Pump Installation', category: 'Plumbing', priceEstimate: 'KES 3,500 - 8,000', duration: '1 day', keywords: ['tank', 'water', 'install', 'plumber', 'pump'] },
  { name: 'Electric Fault Diagnosis & Fix', category: 'Electrical', priceEstimate: 'KES 1,000 - 2,000', duration: '1-2 hrs', keywords: ['fault', 'wiring', 'fuse', 'power', 'shock', 'electrician'] },
  { name: 'Complete House Rewiring', category: 'Electrical', priceEstimate: 'KES 15,000 - 50,000', duration: '2-4 days', keywords: ['wire', 'rewire', 'power', 'electrician', 'lights'] },
  { name: 'Socket & Switch Replacement', category: 'Electrical', priceEstimate: 'KES 500 - 1,200', duration: '1 hr', keywords: ['socket', 'switch', 'light', 'electrician', 'power'] },
  { name: 'Door Lock Repair & Installation', category: 'Carpentry', priceEstimate: 'KES 800 - 1,800', duration: '1 hr', keywords: ['door', 'lock', 'wood', 'furniture', 'carpenter', 'frame'] },
  { name: 'Custom Wardrobes & Cabinets', category: 'Carpentry', priceEstimate: 'KES 12,000 - 40,000', duration: '3-5 days', keywords: ['cabinet', 'wardrobe', 'wood', 'furniture', 'carpenter', 'kitchen'] },
  { name: 'Roof Construction & Repair', category: 'Carpentry', priceEstimate: 'KES 8,000 - 30,000', duration: '2-5 days', keywords: ['roof', 'timber', 'wood', 'carpenter', 'house'] },
  { name: 'Masonry & Wall Repair', category: 'Construction', priceEstimate: 'KES 2,000 - 5,000', duration: '1-2 days', keywords: ['brick', 'cement', 'concrete', 'masonry', 'stone', 'builder', 'wall'] },
  { name: 'Plastering & Painting Services', category: 'Construction', priceEstimate: 'KES 3,000 - 12,000', duration: '1-3 days', keywords: ['paint', 'plaster', 'wall', 'decor', 'builder', 'painter'] },
  { name: 'Floor Tiling & Grouting', category: 'Construction', priceEstimate: 'KES 4,000 - 15,000', duration: '1-2 days', keywords: ['tile', 'floor', 'bathroom', 'builder', 'ceramic'] },
  { name: 'Engine Oil & Filter Change', category: 'Automotive', priceEstimate: 'KES 1,500 - 3,500', duration: '1-2 hrs', keywords: ['oil', 'car', 'engine', 'filter', 'mechanic', 'service'] },
  { name: 'Brake Pad & Disc Replacement', category: 'Automotive', priceEstimate: 'KES 1,200 - 2,800', duration: '1-2 hrs', keywords: ['brake', 'car', 'mechanic', 'pad', 'safety'] },
  { name: 'Car Battery Diagnosis & Jump', category: 'Automotive', priceEstimate: 'KES 800 - 1,500', duration: '30 mins', keywords: ['battery', 'car', 'start', 'power', 'mechanic', 'electrician'] },
  { name: 'Post-Renovation House Cleaning', category: 'Cleaning', priceEstimate: 'KES 3,000 - 7,000', duration: '4-6 hrs', keywords: ['clean', 'house', 'dust', 'office', 'dirt'] },
  { name: 'Deep Sofa & Rug Cleaning', category: 'Cleaning', priceEstimate: 'KES 1,500 - 4,000', duration: '2-4 hrs', keywords: ['carpet', 'sofa', 'upholstery', 'clean', 'vacuum', 'couch'] },
  { name: 'Regular General Housekeeping', category: 'Cleaning', priceEstimate: 'KES 1,000 - 2,000', duration: '3-5 hrs', keywords: ['house', 'home', 'clean', 'sweep', 'mop', 'maid'] },
  { name: 'Lawn Mowing & Yard Trimming', category: 'Outdoor', priceEstimate: 'KES 1,000 - 2,500', duration: '2-4 hrs', keywords: ['lawn', 'grass', 'garden', 'plant', 'trim', 'hedges', 'landscaping'] },
  { name: 'Security Fence & Gate Setup', category: 'Outdoor', priceEstimate: 'KES 10,000 - 40,000', duration: '2-4 days', keywords: ['fence', 'gate', 'security', 'yard', 'boundary'] },
  { name: 'CCTV Surveillance Camera Setup', category: 'Specialized', priceEstimate: 'KES 5,000 - 15,000', duration: '1-2 days', keywords: ['cctv', 'camera', 'security', 'surveillance', 'wire', 'tech'] },
  { name: 'Smart Fingerprint Lock Setup', category: 'Specialized', priceEstimate: 'KES 3,000 - 7,000', duration: '2-3 hrs', keywords: ['lock', 'smart', 'door', 'security', 'keyless', 'tech'] },
];

interface LandingPageProps {
  onGetStarted: () => void;
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();
  const darkMode = theme === 'dark';
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [footerModalOpen, setFooterModalOpen] = useState(false);
  const [activeFooterTab, setActiveFooterTab] = useState('about-us');

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredServices = searchQuery.trim() === '' 
    ? (selectedCategory 
        ? SPECIFIC_SERVICES.filter(service => service.category.toLowerCase() === selectedCategory.toLowerCase())
        : []) 
    : SPECIFIC_SERVICES.filter(service => 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  const getCategoryColor = (color: string) => {
    if (!darkMode) return color;
    return color
      .replace('bg-blue-50', 'bg-blue-500/10')
      .replace('bg-amber-50', 'bg-amber-500/10')
      .replace('bg-orange-50', 'bg-orange-500/10')
      .replace('bg-red-50', 'bg-red-500/10')
      .replace('bg-emerald-50', 'bg-emerald-500/10')
      .replace('bg-lime-50', 'bg-lime-500/10')
      .replace('bg-indigo-50', 'bg-indigo-500/10');
  };

  const categories = [
    { name: 'Plumbing', icon: Droplet, count: 18, color: 'text-blue-500 bg-blue-50' },
    { name: 'Electrical', icon: Zap, count: 14, color: 'text-amber-500 bg-amber-50' },
    { name: 'Carpentry', icon: Hammer, count: 12, color: 'text-orange-500 bg-orange-50' },
    { name: 'Construction', icon: Hammer, count: 22, color: 'text-orange-500 bg-orange-50' },
    { name: 'Automotive', icon: Car, count: 9, color: 'text-red-500 bg-red-50' },
    { name: 'Cleaning', icon: Sparkles, count: 15, color: 'text-emerald-500 bg-emerald-50' },
    { name: 'Outdoor', icon: Leaf, count: 11, color: 'text-lime-500 bg-lime-50' },
    { name: 'Specialized', icon: Shield, count: 7, color: 'text-indigo-500 bg-indigo-50' },
  ];

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

  const faqs: FAQItem[] = [
    {
      question: 'What is Kazify and how does it work in Kenya?',
      answer: 'Kazify is Kenya\'s premier digital marketplace connecting certified local tradespersons (Fundis) with households and businesses. Clients can post custom jobs to receive competitive bids, or search and dispatch the nearest experts. The platform coordinates communication, milestone booking, and secure escrow payouts.',
    },
    {
      question: 'How does the M-Pesa Escrow Wallet guarantee my money\'s safety?',
      answer: 'Your payments are held securely in a multi-layered escrow account linked directly via standard M-Pesa STK Push. Once you accept a quote, funds are secured in escrow and are only released to the Fundi after the service is completed, verified, and you click "Release Funds" from your client center. This fully protects both clients and tradespeople.',
    },
    {
      question: 'Are Fundis on Kazify certified and compliant with CBK AML regulations?',
      answer: 'Absolutely. Every service expert on Kazify undergoes high-level background checks in compliance with the Central Bank of Kenya (CBK) Anti-Money Laundering (AML) guidelines. Registered experts are required to upload digital copies of their National ID or Passport and valid NITA (National Industrial Training Authority) or other relevant trade certifications before they are authorized to place bids or accept booking requests.',
    },
    {
      question: 'How does the Booking Availability Calendar work?',
      answer: 'Every verified tradesperson has an interactive Booking Availability Calendar integrated directly into their professional profile. This calendar allows Fundis to designate their preferred working hours, select their active service days, and block off unavailable dates. Clients can view these operating blocks in real-time to pick a convenient, available date and propose it during client chats.',
    },
    {
      question: 'What should I do if a dispute arises during a service?',
      answer: 'Kazify maintains a structured Dispute Resolution Room where clients and service providers can lodge complaints, share progress photos, and coordinate with an independent platform mediator. While a dispute is open, the escrow wallet holding the service payment remains locked until a consensus is reached or a formal resolution is completed.',
    },
    {
      question: 'How can I register as a skilled service provider (Fundi)?',
      answer: 'Skilled professionals can register by clicking "Access Platform" and selecting the "Register as a Service Provider (Fundi)" option. You will be prompted to submit your KYC documentation (National ID/Passport), location preferences, and professional trade certifications (such as NITA licenses). Once our compliance desk verifies your credentials, you can immediately begin bidding on local tasks.'
    }
  ];

  return (
    <div id="landing-container" className={`min-height-screen flex flex-col font-sans transition-colors duration-300 ${
      darkMode ? 'bg-slate-950 text-slate-100' : 'bg-white text-slate-900'
    }`}>
      <Helmet 
        title="Local Tradespersons & Escrow" 
        description="Kazify connects you with vetted local handymen (Fundis) in Kenya. Secure payments held safely in M-Pesa escrow and fair budget estimations powered by Gemini AI."
      />
      {/* Hero Header */}
      <header id="hero-header" role="banner" className={`relative text-white overflow-hidden border-b transition-colors duration-300 ${
        darkMode ? 'bg-slate-950 border-orange-500/10' : 'bg-slate-900 border-orange-500/20'
      }`}>
        {/* Abstract background blobs */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-400 via-blue-500 to-indigo-900"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 relative">
          {/* Nav */}
          <nav aria-label="Main Navigation" className="flex items-center justify-between mb-12">
            <div className="flex items-center space-x-3" tabIndex={0} aria-label="Kazify Logo">
              <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <span className="font-display font-bold text-xl text-slate-950">K</span>
              </div>
              <span className="font-display font-bold text-2xl tracking-tight text-white uppercase">
                Kaz<span className="text-orange-500">ify</span>
              </span>
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
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-mono text-slate-300">Launching across Kenya</span>
              </div>

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

      {/* Categories Grid Section */}
      <section id="categories" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className={`font-display text-3xl font-bold tracking-tight transition-colors duration-300 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Professional Trades in Kenya
          </h2>
          <p className={`mt-2 transition-colors duration-300 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            No work is too large or small. Select standard trades categories to hire vetted professionals instantly or get quotes.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-10">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for specific services or trades (e.g., leak, wiring, lock, sofa)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full py-3.5 pl-11 pr-10 rounded-2xl border text-sm font-sans focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all ${
                darkMode
                  ? 'bg-slate-900 border-slate-800 text-white placeholder:text-slate-500 focus:border-orange-500'
                  : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-orange-500'
              }`}
              id="category-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-orange-500 transition-colors cursor-pointer"
                id="clear-search-btn"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Popular searches suggestions */}
          <div className="flex flex-wrap gap-2 justify-center mt-3 text-xs">
            <span className="text-slate-500 font-mono py-1">Popular:</span>
            {['Leaking Pipe', 'House Rewiring', 'Sofa Cleaning', 'CCTV Setup', 'Lock Repair', 'Painting'].map(tag => (
              <button
                key={tag}
                onClick={() => setSearchQuery(tag)}
                className="px-2.5 py-1 rounded-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 transition-all font-mono text-[11px] cursor-pointer"
              >
                {tag}
              </button>
            ))}
          </div>

          {searchQuery && (
            <p className="text-center text-xs font-mono text-slate-400 mt-3">
              Found {categories.filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase())).length} matching {categories.filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 1 ? 'category' : 'categories'} & {filteredServices.length} {filteredServices.length === 1 ? 'service package' : 'service packages'}
            </p>
          )}
        </div>

        {/* Categories Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Trade Categories</span>
            {selectedCategory && (
              <button 
                onClick={() => setSelectedCategory(null)}
                className="text-[10px] font-mono text-orange-500 hover:text-orange-400 transition cursor-pointer"
              >
                Reset Filter
              </button>
            )}
          </div>
          {categories.filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8 gap-4">
              {categories
                .filter(cat => cat.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((cat) => {
                  const Icon = cat.icon;
                  const dynamicColorClass = getCategoryColor(cat.color);
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <div
                      key={cat.name}
                      onClick={() => setSelectedCategory(isSelected ? null : cat.name)}
                      className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer text-center flex flex-col items-center justify-center space-y-3 group ${
                        isSelected
                          ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/20'
                          : (darkMode 
                            ? 'bg-slate-900 border-slate-800 hover:border-orange-500/40 hover:shadow-xl hover:shadow-orange-500/5' 
                            : 'bg-white border-slate-200/80 hover:border-orange-500/40 hover:shadow-lg hover:shadow-slate-100')
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${dynamicColorClass} group-hover:scale-105 transition-transform`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className={`text-sm font-semibold block transition-colors duration-300 ${
                        darkMode ? 'text-white' : 'text-slate-900'
                      }`}>{cat.name}</span>
                      <span className="text-xs text-slate-400 font-mono block">{cat.count} Fundis ready</span>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-6 bg-slate-900/10 border border-dashed border-slate-850 rounded-2xl max-w-sm mx-auto">
              <p className="text-xs font-mono text-slate-500">No matching general trade categories.</p>
            </div>
          )}
        </div>

        {/* Global Search matched services */}
        {(searchQuery.trim() !== '' || selectedCategory !== null) && (
          <div className="mt-12 text-left animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3 mb-6">
              <Sparkles className="w-4 h-4 text-orange-500 animate-pulse animate-duration-1000" />
              <h3 className={`text-lg font-bold font-display ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                {selectedCategory ? `${selectedCategory} Service Packages` : 'Matching Specific Trades & Services'} ({filteredServices.length})
              </h3>
            </div>
            
            {filteredServices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredServices.map((service, index) => (
                  <div 
                    key={index}
                    className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
                      darkMode 
                        ? 'bg-slate-900/60 border-slate-850 hover:border-orange-500/30 hover:bg-slate-900/85' 
                        : 'bg-slate-50 border-slate-205 hover:border-orange-500/30 hover:bg-slate-100/50'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2.5 py-1 text-[10px] font-bold font-mono uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
                          {service.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-1" />
                          {service.duration}
                        </span>
                      </div>
                      <h4 className={`font-bold font-display text-base ${darkMode ? 'text-white' : 'text-slate-900'}`}>
                        {service.name}
                      </h4>
                      <p className="text-xs text-slate-400 mt-2 font-mono">
                        Estimated cost: <strong className="text-emerald-400">{service.priceEstimate}</strong>
                      </p>
                    </div>
                    
                    <button
                      onClick={onGetStarted}
                      className="mt-4 w-full py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded-xl text-xs transition duration-200 cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <span>Request Booking & Quotes</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-900/10 border border-dashed border-slate-850 rounded-2xl max-w-sm mx-auto">
                <p className="text-xs font-mono text-slate-500 leading-relaxed">No custom service packages matched your exact keywords. You can still access the platform to post a custom description and receive tailored bids!</p>
                <button 
                  onClick={onGetStarted}
                  className="mt-3.5 px-4 py-2 bg-orange-500 hover:bg-orange-400 text-slate-950 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Post Custom Job Request
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Value Proposition */}
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

      {/* Frequently Asked Questions Section */}
      <section id="faq" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center mb-12">
          <span className="text-[10px] bg-orange-500/10 text-orange-500 border border-orange-500/20 px-3 py-1 rounded-full font-mono uppercase tracking-widest font-bold">
            COMMON INQUIRIES
          </span>
          <h2 className={`font-display text-3xl font-extrabold tracking-tight mt-3 transition-colors duration-300 ${
            darkMode ? 'text-white' : 'text-slate-900'
          }`}>
            Frequently Asked Questions
          </h2>
          <p className={`mt-2 text-sm max-w-lg mx-auto transition-colors duration-300 ${
            darkMode ? 'text-slate-400' : 'text-slate-500'
          }`}>
            Find answers to standard system validation, escrow payouts, and contractor verification steps across Kenya.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div 
                key={idx}
                className={`rounded-2xl overflow-hidden transition-all duration-300 ${
                  darkMode 
                    ? 'bg-slate-900 border border-slate-800 hover:border-slate-700/80' 
                    : 'bg-white border border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className={`w-full flex items-center justify-between p-5 text-left font-semibold transition-colors focus:outline-none ${
                    darkMode ? 'text-slate-100 hover:text-orange-400' : 'text-slate-900 hover:text-orange-500'
                  }`}
                >
                  <span className="text-sm font-bold pr-4">{faq.question}</span>
                  <ChevronDown 
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isOpen 
                        ? 'rotate-180 text-orange-500' 
                        : (darkMode ? 'text-slate-500' : 'text-slate-400')
                    }`} 
                  />
                </button>
                
                <div 
                  className={`transition-all duration-200 ease-in-out overflow-hidden ${
                    isOpen 
                      ? `max-h-48 border-t ${darkMode ? 'border-slate-800/60' : 'border-slate-100'}` 
                      : 'max-h-0'
                  }`}
                >
                  <div className={`p-5 text-xs leading-relaxed font-mono transition-colors duration-300 ${
                    darkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    {faq.answer}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Footer info */}
      <footer role="contentinfo" className={`mt-auto py-12 border-t transition-colors duration-300 ${
        darkMode ? 'bg-slate-950 text-slate-300 border-slate-900' : 'bg-slate-900 text-slate-100 border-slate-800'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 text-left">
            {/* ABOUT KAZIFY */}
            <div id="footer-about-kazify-col" role="region" aria-label="About Kazify Links">
              <h3 className="text-sm font-bold tracking-wider text-orange-500 uppercase mb-4">ABOUT KAZIFY</h3>
              <nav aria-label="About Kazify Navigation">
                <ul className="space-y-2 text-xs">
                  <li><button onClick={() => { setActiveFooterTab('about-us'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="About us">About us</button></li>
                  <li><button onClick={() => { setActiveFooterTab('refund-policy'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Returns and Refunds Policy">Returns and Refunds Policy</button></li>
                  <li><button onClick={() => { setActiveFooterTab('careers'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Kazify Careers">Kazify Careers</button></li>
                  <li><button onClick={() => { setActiveFooterTab('express'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Kazify Express">Kazify Express</button></li>
                  <li><button onClick={() => { setActiveFooterTab('terms'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Terms and Conditions">Terms and Conditions</button></li>
                  <li><button onClick={() => { setActiveFooterTab('credit-terms'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Store Credit Terms and Conditions">Store Credit Terms and Conditions</button></li>
                  <li><button onClick={() => { setActiveFooterTab('privacy'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Privacy Notice">Privacy Notice</button></li>
                  <li><button onClick={() => { setActiveFooterTab('cookies'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Cookies Notice">Cookies Notice</button></li>
                  <li><button onClick={() => { setActiveFooterTab('flash-sales'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Flash Sales">Flash Sales</button></li>
                </ul>
              </nav>
            </div>

            {/* USEFUL LINKS */}
            <div id="footer-useful-links-col" role="region" aria-label="Useful Links">
              <h3 className="text-sm font-bold tracking-wider text-orange-500 uppercase mb-4">USEFUL LINKS</h3>
              <nav aria-label="Useful Links Navigation">
                <ul className="space-y-2 text-xs">
                  <li><button onClick={() => { setActiveFooterTab('track-order'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Track Your Order">Track Your Order</button></li>
                  <li><button onClick={() => { setActiveFooterTab('shipping'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Shipping and delivery guidelines">Shipping and delivery</button></li>
                  <li><button onClick={() => { setActiveFooterTab('pickup-stations'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Pick-up Stations">Pick-up Stations</button></li>
                  <li><button onClick={() => { setActiveFooterTab('return-policy'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Return Policy">Return Policy</button></li>
                  <li><button onClick={() => { setActiveFooterTab('how-to-order'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="How to Order">How to Order?</button></li>
                  <li><button onClick={() => { setActiveFooterTab('dispute-policy'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Dispute Resolution Policy">Dispute Resolution Policy</button></li>
                  <li><button onClick={() => { setActiveFooterTab('corporate-bulk'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Corporate and Bulk Purchase">Corporate and Bulk Purchase</button></li>
                  <li><button onClick={() => { setActiveFooterTab('advertise'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Advertise with Kazify">Advertise with Kazify</button></li>
                  <li><button onClick={() => { setActiveFooterTab('report-product'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Report a Product">Report a Product</button></li>
                  <li><button onClick={() => { setActiveFooterTab('payment-guidelines'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Kazify Payment Information Guidelines">Kazify Payment Information Guidelines</button></li>
                  <li><button onClick={() => { setActiveFooterTab('black-friday'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Black Friday Promos">Black Friday</button></li>
                </ul>
              </nav>
            </div>

            {/* MAKE MONEY WITH KAZIFY */}
            <div id="footer-make-money-col" role="region" aria-label="Earn with Kazify">
              <h3 className="text-sm font-bold tracking-wider text-orange-500 uppercase mb-4">MAKE MONEY WITH KAZIFY</h3>
              <nav aria-label="Earnings Navigation">
                <ul className="space-y-2 text-xs">
                  <li><button onClick={() => { setActiveFooterTab('sell'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Sell your services on Kazify">Sell on Kazify</button></li>
                  <li><button onClick={() => { setActiveFooterTab('vendor-hub'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Vendor Hub log in">Vendor Hub</button></li>
                  <li><button onClick={() => { setActiveFooterTab('consultant'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Become a Sales Consultant">Become a Sales Consultant</button></li>
                  <li><button onClick={() => { setActiveFooterTab('order-point'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 cursor-pointer text-left block w-full focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Become A Kazify Order Point">Become A Kazify Order Point</button></li>
                </ul>
              </nav>
            </div>

            {/* NEED HELP? Chat with us */}
            <div id="footer-help-col" role="region" aria-label="Customer Support Contact">
              <h3 className="text-sm font-bold tracking-wider text-orange-500 uppercase mb-4">NEED HELP? Chat with us</h3>
              <ul className="space-y-3 text-xs">
                <li><button onClick={() => { setActiveFooterTab('help-center'); setFooterModalOpen(true); }} className="hover:text-white transition-colors duration-200 font-medium bg-orange-500 text-slate-950 px-3 py-1.5 rounded-md inline-block mb-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none text-center" aria-label="Visit Kazify Help Center">Help Center</button></li>
                <li className="flex flex-col space-y-1">
                  <span className="text-slate-400">Contact Us Via:</span>
                  <a href="tel:+254786692381" className="text-sm font-bold hover:text-orange-400 transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none" aria-label="Call Kazify Support phone">+254 786 692 381</a>
                </li>
                <li className="flex flex-col space-y-1">
                  <span className="text-slate-400">Visit Us:</span>
                  <span className="font-semibold text-white">Kisumu, Obotte Road</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
            <p>Copyright © 2026 KAZIFY Marketplace. All rights reserved.</p>
            <div className="flex space-x-4">
              <span>National Operations Support: All 47 Counties in Kenya</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Footer Modal for Help and Policies */}
      <FooterModal 
        isOpen={footerModalOpen} 
        onClose={() => setFooterModalOpen(false)} 
        activeTab={activeFooterTab} 
        darkMode={darkMode} 
      />
    </div>
  );
}
