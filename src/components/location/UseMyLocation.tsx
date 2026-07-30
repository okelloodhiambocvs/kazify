import React from 'react';
import { Compass, Locate, MapPin, AlertCircle } from 'lucide-react';

interface UseMyLocationProps {
  lat: number;
  lng: number;
  geoLoading: boolean;
  geoError: string;
  handleGeolocate: () => void;
}

export const UseMyLocation: React.FC<UseMyLocationProps> = ({
  lat,
  lng,
  geoLoading,
  geoError,
  handleGeolocate
}) => {
  return (
    <div className="space-y-3">
      {geoError && (
        <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-mono flex items-center gap-1.5 animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{geoError}</span>
        </div>
      )}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-500/10 rounded-lg text-orange-400">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <span className="text-[10px] text-orange-400 font-mono font-bold tracking-wider uppercase block">
              Dispatcher Coordinate Precision
            </span>
            <h4 className="text-xs font-bold text-white">Kenya Interactive Service Map</h4>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Geolocation Trigger Button */}
          <button
            type="button"
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-400 disabled:bg-orange-500/30 text-slate-950 text-[10px] font-mono font-bold rounded-xl transition cursor-pointer disabled:opacity-50 w-full sm:w-auto"
            id="geolocation-btn"
          >
            <Locate className={`w-3.5 h-3.5 ${geoLoading ? 'animate-spin' : ''}`} />
            <span>{geoLoading ? 'DETECTING GPS...' : 'USE MY GPS'}</span>
          </button>

          {/* Real-time coordinates badge */}
          <div className="flex items-center justify-center space-x-2 bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 text-[10px] font-mono select-all w-full sm:w-auto">
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span className="text-slate-200">LAT: <strong className="text-white">{lat}</strong></span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-200">LNG: <strong className="text-white">{lng}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
