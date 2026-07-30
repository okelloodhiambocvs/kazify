import React from 'react';
import { Sparkles, CheckCircle2 } from 'lucide-react';

export interface Landmark {
  name: string;
  lat: number;
  lng: number;
  desc: string;
}

export const KENYA_LANDMARKS: Landmark[] = [
  // Nairobi
  { name: 'Nairobi CBD Center', lat: -1.286389, lng: 36.817223, desc: 'Capital city commercial hub' },
  { name: 'Westlands Square', lat: -1.2644, lng: 36.8044, desc: 'Nairobi premier trade sector' },
  { name: 'Upperhill Precinct', lat: -1.2985, lng: 36.8122, desc: 'Financial district zone' },
  // Mombasa
  { name: 'Mombasa CBD (Digo Rd)', lat: -4.0644, lng: 39.6725, desc: 'Coastal trade center' },
  { name: 'Nyali Beach Sector', lat: -4.0284, lng: 39.7122, desc: 'Coastal suburb precinct' },
  // Kisumu
  { name: 'Milimani Estate', lat: -0.0917, lng: 34.7680, desc: 'Lakeside residential precinct' },
  { name: 'Kondele Market', lat: -0.1022, lng: 34.7615, desc: 'High-density commercial center' },
  // Nakuru
  { name: 'Nakuru Town Center', lat: -0.3031, lng: 36.0800, desc: 'Rift Valley commercial precinct' },
  { name: 'Eldoret CBD Center', lat: 0.5143, lng: 35.2697, desc: 'Highlands trade hub' }
];

interface LandmarkHotspotsProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  onAddressChange: (address: string) => void;
}

export const LandmarkHotspots: React.FC<LandmarkHotspotsProps> = ({
  lat,
  lng,
  onChange,
  onAddressChange
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-gray-400 font-mono uppercase font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-orange-400" />
          <span>Regional Dispatch Hotspots (Kenya Quick-Snap)</span>
        </label>
        <span className="text-[8.5px] text-slate-500 font-mono font-bold">Accuracy Safe</span>
      </div>
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-1.5">
        {KENYA_LANDMARKS.map((landmark) => {
          const isSelected = Math.abs(lat - landmark.lat) < 0.0001 && Math.abs(lng - landmark.lng) < 0.0001;
          return (
            <button
              key={landmark.name}
              type="button"
              onClick={() => {
                onChange(landmark.lat, landmark.lng);
                onAddressChange(`${landmark.name}`);
              }}
              className={`py-1.5 px-2 rounded-xl border text-center transition-all duration-150 cursor-pointer flex flex-col justify-between items-center h-14 ${
                isSelected 
                  ? 'border-orange-500 bg-orange-500/10 text-white' 
                  : 'border-slate-850 bg-slate-950 hover:border-slate-700 text-slate-400 hover:text-white'
              }`}
              title={landmark.desc}
            >
              <div className="text-[9px] font-bold tracking-tight truncate w-full">{landmark.name}</div>
              {isSelected ? (
                <CheckCircle2 className="w-3 h-3 text-orange-500" />
              ) : (
                <span className="text-[7.5px] font-mono text-slate-500 block">Snap coordinates</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
