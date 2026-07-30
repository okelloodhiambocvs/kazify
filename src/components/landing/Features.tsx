import React from 'react';
import { 
  Hammer, Zap, Droplet, Shield, Sparkles, Car, Leaf, ArrowRight, Clock, Search 
} from 'lucide-react';

interface ServiceItem {
  name: string;
  category: string;
  priceEstimate: string;
  duration: string;
  keywords: string[];
}

export const SPECIFIC_SERVICES: ServiceItem[] = [
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

interface FeaturesProps {
  darkMode: boolean;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (val: string | null) => void;
  onGetStarted: () => void;
}

export const Features: React.FC<FeaturesProps> = ({
  darkMode,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  onGetStarted
}) => {
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

  const filteredServices = searchQuery.trim() === '' 
    ? (selectedCategory 
        ? SPECIFIC_SERVICES.filter(service => service.category.toLowerCase() === selectedCategory.toLowerCase())
        : []) 
    : SPECIFIC_SERVICES.filter(service => 
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.keywords.some(kw => kw.toLowerCase().includes(searchQuery.toLowerCase()))
      );

  return (
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
  );
};
