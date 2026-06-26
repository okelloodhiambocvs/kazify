import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { 
  MapPin, Compass, Locate, AlertCircle, Info, Sparkles, Building, 
  Map as MapIcon, RefreshCw, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';

interface LocationPickerProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  address: string;
  onAddressChange: (address: string) => void;
}

// Popular Kenyan snapped landmarks for fast high-accuracy dispatching across the nation
const KENYA_LANDMARKS = [
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

export default function LocationPicker({ lat, lng, onChange, address, onAddressChange }: LocationPickerProps) {
  const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
  const hasValidKey = Boolean(API_KEY) && API_KEY.startsWith('AIzaSy') && API_KEY.length >= 30;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverDistrict, setHoverDistrict] = useState<string>('');
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState('');

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }
    setGeoLoading(true);
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = parseFloat(position.coords.latitude.toFixed(6));
        const currentLng = parseFloat(position.coords.longitude.toFixed(6));
        onChange(currentLat, currentLng);
        
        // Estimate name
        const estimated = estimateDistrictName(currentLat, currentLng);
        onAddressChange(`${estimated} (GPS Detected)`);
        setGeoLoading(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        setGeoError(error.message || 'Unable to retrieve location.');
        setGeoLoading(false);
        // Fallback to default
        onChange(-1.286389, 36.817223);
        onAddressChange('Nairobi Center (GPS Fallback)');
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // Determine active geographic center anchor dynamically
  const getRegionCenter = (latitude: number, longitude: number) => {
    if (latitude < -2.5) {
      return { lat: -4.0644, lng: 39.6725, label: 'MOMBASA COAST', name: 'Mombasa' };
    } else if (latitude < -0.6) {
      return { lat: -1.286389, lng: 36.817223, label: 'NAIROBI REGION', name: 'Nairobi' };
    } else if (latitude > 0.1) {
      return { lat: 0.5143, lng: 35.2697, label: 'ELDORET REGION', name: 'Eldoret' };
    } else if (latitude > -0.5 && latitude < 0.1 && longitude > 35.5) {
      return { lat: -0.3031, lng: 36.0800, label: 'NAKURU REGION', name: 'Nakuru' };
    } else {
      return { lat: -0.0917, lng: 34.7680, label: 'KISUMU REGION', name: 'Kisumu' };
    }
  };
  
  // Update address based on selected simulated district coordinates
  const estimateDistrictName = (latitude: number, longitude: number): string => {
    const center = getRegionCenter(latitude, longitude);
    if (center.name === 'Nairobi') {
      if (latitude > -1.27) return 'Westlands Division, Nairobi';
      if (latitude < -1.295) return 'Upperhill District, Nairobi';
      if (longitude < 36.80) return 'Kilimani Area, Nairobi';
      return 'Nairobi CBD Center, GPO';
    } else if (center.name === 'Mombasa') {
      if (latitude > -4.04) return 'Nyali Waterfront, Mombasa';
      if (longitude < 39.65) return 'Kilindini Port Area, Mombasa';
      return 'Digo Road, Mombasa CBD';
    } else if (center.name === 'Eldoret') {
      if (longitude > 35.28) return 'Elgon View Estate, Eldoret';
      return 'Eldoret Town Center, Uasin Gishu';
    } else if (center.name === 'Nakuru') {
      if (longitude > 36.09) return 'Section 58, Nakuru';
      return 'Kenyatta Avenue, Nakuru CBD';
    } else {
      if (latitude > -0.095) {
        if (longitude < 34.762) return 'Kondele Area, Kisumu';
        if (longitude > 34.775) return 'Manyatta Sector, Kisumu';
        return 'Milimani Estate, Kisumu';
      } else if (latitude < -0.108) {
        return 'Nyalenda Waterfront, Kisumu';
      } else {
        if (longitude < 34.755) return 'Kisumu CBD Center, Jomo Kenyatta Hwy';
        return 'Tom Mboya Ring Road, Kisumu';
      }
    }
  };

  // Click on canvas to simulate pining location
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const center = getRegionCenter(lat, lng);
    const clickedLng = center.lng + (x - 200) / 10000;
    const clickedLat = center.lat - (y - 140) / 10000;

    const parsedLat = parseFloat(clickedLat.toFixed(6));
    const parsedLng = parseFloat(clickedLng.toFixed(6));

    onChange(parsedLat, parsedLng);
    
    const districtName = estimateDistrictName(parsedLat, parsedLng);
    onAddressChange(`${districtName} (Pinned via Dispatch Map)`);
  };

  // Tracks mouse movement on canvas to show neighborhood preview
  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const center = getRegionCenter(lat, lng);
    const hoverLng = center.lng + (x - 200) / 10000;
    const hoverLat = center.lat - (y - 140) / 10000;

    const district = estimateDistrictName(hoverLat, hoverLng);
    setHoverDistrict(district);
  };

  // Render simulated Kisumu grid map when offline
  useEffect(() => {
    if (hasValidKey) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    const drawGridMap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw Land Base
      ctx.fillStyle = '#0f172a'; // slate-900 background
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Draw Region Specific Bodies of Water or Landmarks
      const center = getRegionCenter(lat, lng);
      if (center.name === 'Kisumu') {
        ctx.fillStyle = '#0369a190'; // light sky blue with opacity
        ctx.beginPath();
        ctx.arc(-20, 280, 130, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('LAKE VICTORIA (GULF)', 10, 240);
      } else if (center.name === 'Mombasa') {
        ctx.fillStyle = '#0369a190';
        ctx.beginPath();
        ctx.arc(420, 280, 180, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0284c7';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('INDIAN OCEAN COAST', 280, 240);
      } else if (center.name === 'Nairobi') {
        ctx.fillStyle = '#14532d50'; // green parks
        ctx.beginPath();
        ctx.arc(80, 80, 70, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#22c55e';
        ctx.font = 'bold 8px monospace';
        ctx.fillText('UHURU PARK', 50, 80);
      }

      // 3. Coordinate Grids
      ctx.strokeStyle = '#1e293b'; // slate-800 grid lines
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }
      for (let j = 0; j < canvas.height; j += 40) {
        ctx.beginPath();
        ctx.moveTo(0, j); ctx.lineTo(canvas.width, j);
        ctx.stroke();
      }

      // 4. Draw Principal Roads
      ctx.strokeStyle = '#334155'; // slate-700 roads
      ctx.lineWidth = 8;
      
      // Vertical principal highway
      ctx.beginPath();
      ctx.moveTo(110, 0); ctx.lineTo(110, canvas.height);
      ctx.stroke();

      // Diagonal highway
      ctx.beginPath();
      ctx.moveTo(110, 100); ctx.lineTo(380, 30);
      ctx.stroke();

      // Horizontal Ring bypass
      ctx.beginPath();
      ctx.moveTo(40, 100); ctx.lineTo(360, 100);
      ctx.stroke();

      // Inner feeder road
      ctx.beginPath();
      ctx.moveTo(45, 200); ctx.lineTo(360, 200);
      ctx.stroke();

      // 5. Street Network & Neighborhood labels based on active region
      ctx.fillStyle = '#64748b'; // slate-500
      ctx.font = 'italic 7.5px sans-serif';

      if (center.name === 'Nairobi') {
        ctx.fillText('Uhuru Highway', 118, 50);
        ctx.fillText('Thika Road', 260, 52);
        ctx.fillText('Mombasa Road', 230, 114);
        ctx.fillText('Waiyaki Way', 30, 182);

        ctx.fillStyle = '#475569'; // slate-600
        ctx.font = 'bold 8.5px sans-serif';
        ctx.fillText('WESTLANDS', 250, 75);
        ctx.fillText('UPPERHILL', 240, 160);
        ctx.fillText('KILIMANI', 315, 140);
        ctx.fillText('SOUTH C', 140, 230);
        ctx.fillText('NAIROBI CBD', 50, 130);
      } else if (center.name === 'Mombasa') {
        ctx.fillText('Nyali Bridge Rd', 118, 50);
        ctx.fillText('Links Road', 260, 52);
        ctx.fillText('Digo Road', 230, 114);
        ctx.fillText('Ferry Access', 30, 182);

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 8.5px sans-serif';
        ctx.fillText('NYALI', 250, 75);
        ctx.fillText('KILINDINI', 240, 160);
        ctx.fillText('BAMBURI', 315, 140);
        ctx.fillText('LIKONI', 140, 230);
        ctx.fillText('MOMBASA CBD', 50, 130);
      } else if (center.name === 'Nakuru' || center.name === 'Eldoret') {
        ctx.fillText('Kenyatta Avenue', 118, 50);
        ctx.fillText('Highway Main', 260, 52);
        ctx.fillText('Feeder Ring Rd', 230, 114);
        ctx.fillText('Old Airport Rd', 30, 182);

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 8.5px sans-serif';
        ctx.fillText('SECTION 58', 250, 75);
        ctx.fillText('MILIMANI', 240, 160);
        ctx.fillText('LANET AREA', 315, 140);
        ctx.fillText('TOWN CENTER', 50, 130);
      } else {
        ctx.fillText('Jomo Kenyatta Hwy', 118, 50);
        ctx.fillText('Kakamega Rd', 260, 52);
        ctx.fillText('Kondele Bypass Rd', 230, 114);
        ctx.fillText('Kisumu Port Rd', 30, 182);

        ctx.fillStyle = '#475569';
        ctx.font = 'bold 8.5px sans-serif';
        ctx.fillText('KONDELE', 250, 75);
        ctx.fillText('MILIMANI', 240, 160);
        ctx.fillText('MANYATTA', 315, 140);
        ctx.fillText('NYALENDA', 140, 230);
        ctx.fillText('KISUMU CBD', 50, 130);
      }

      // 7. Calculate client marker position in canvas coordinates
      const markerX = (lng - center.lng) * 10000 + 200;
      const markerY = -(lat - center.lat) * 10000 + 140;

      // Draw active target radial radar wave
      const radialPulse = (Date.now() / 6) % 35;
      ctx.strokeStyle = '#f9731633';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(markerX, markerY, radialPulse, 0, Math.PI * 2);
      ctx.stroke();

      // Draw Selected Pin
      ctx.fillStyle = '#f97316'; // orange-500
      ctx.beginPath();
      ctx.arc(markerX, markerY, 7, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(markerX, markerY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fb923c';
      ctx.font = 'bold 8px monospace';
      ctx.fillText('PINNED LOCATION', markerX + 10, markerY + 3);

      animFrame = requestAnimationFrame(drawGridMap);
    };

    drawGridMap();
    return () => cancelAnimationFrame(animFrame);
  }, [lat, lng, hasValidKey]);

  // Click handler on real Google Map
  const handleMapClick = (e: any) => {
    if (e.detail && e.detail.latLng) {
      const clickedLat = parseFloat(e.detail.latLng.lat.toFixed(6));
      const clickedLng = parseFloat(e.detail.latLng.lng.toFixed(6));
      onChange(clickedLat, clickedLng);

      // Also trigger a reverse geocode description helper if possible
      const districtName = estimateDistrictName(clickedLat, clickedLng);
      onAddressChange(`${districtName} (Pinned via Google Map)`);
    }
  };

  return (
    <div className="space-y-3.5 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
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

      {/* Map Widget Canvas / Google Frame */}
      <div className="relative h-44 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 group">
        {hasValidKey ? (
          <APIProvider apiKey={API_KEY} version="weekly">
            <Map
              center={{ lat, lng }}
              zoom={13.5}
              mapId="DISPATCH_PICKER_MAP"
              onClick={handleMapClick}
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              style={{ width: '100%', height: '100%' }}
              gestureHandling="cooperative"
            >
              <AdvancedMarker position={{ lat, lng }} title="Job Service Pin">
                <Pin background="#f97316" glyphColor="#fff" borderColor="#ea580c" />
              </AdvancedMarker>
            </Map>
          </APIProvider>
        ) : (
          <div className="w-full h-full relative">
            <canvas
              ref={canvasRef}
              width={400}
              height={176}
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMouseMove}
              onMouseLeave={() => setHoverDistrict('')}
              className="w-full h-full block cursor-crosshair active:scale-[0.99] transition-transform"
              title="Click on street network to update coordinates"
            />

            {/* Quick interactive neighborhood hover layer */}
            {hoverDistrict && (
              <div className="absolute top-2 left-2 bg-slate-950/90 border border-slate-800/80 px-2 py-1 rounded text-[9px] text-orange-400 font-mono flex items-center space-x-1 shadow-md">
                <Layers className="w-3 h-3 text-slate-500" />
                <span>Hovering: {hoverDistrict}</span>
              </div>
            )}

            <div className="absolute bottom-2 left-2 right-2 bg-slate-950/80 backdrop-blur-sm border border-slate-800/60 p-1.5 rounded-lg text-[9px] text-slate-400 font-mono text-center flex items-center justify-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
              <span>Click simulated streets above to lock dispatcher coordinate pin</span>
            </div>
          </div>
        )}
      </div>

      {/* Popular Snapped Landmarks Quick Bar */}
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
    </div>
  );
}
