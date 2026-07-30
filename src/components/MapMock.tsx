import React, { useEffect, useState, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, Navigation, Compass, AlertCircle } from 'lucide-react';

interface MapMockProps {
  customerLocation?: { lat: number; lng: number; address: string };
  fundiLocation?: { lat: number; lng: number; address: string };
  isTracking?: boolean;
}

export default function MapMock({ customerLocation, fundiLocation, isTracking }: MapMockProps) {
  const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
  const hasValidKey = Boolean(API_KEY) && API_KEY.startsWith('AIzaSy') && API_KEY.length >= 30;

  const defaultCenter = customerLocation || { lat: -1.286389, lng: 36.817223 }; // Nairobi default

  const getRegionCenter = (latitude: number, longitude: number) => {
    if (latitude < -2.5) {
      return { lat: -4.0644, lng: 39.6725, label: 'Mombasa Rd', labelSecondary: 'Nyali Bridge', city: 'Mombasa', landmarkName: 'Mombasa Coast' };
    } else if (latitude < -0.6) {
      return { lat: -1.286389, lng: 36.817223, label: 'Uhuru Highway', labelSecondary: 'Thika Road', city: 'Nairobi', landmarkName: 'Nairobi CBD' };
    } else if (latitude > 0.1) {
      return { lat: 0.5143, lng: 35.2697, label: 'Kenyatta Ave', labelSecondary: 'Eldoret Hwy', city: 'Eldoret', landmarkName: 'Eldoret Center' };
    } else if (latitude > -0.5 && latitude < 0.1 && longitude > 35.5) {
      return { lat: -0.3031, lng: 36.0800, label: 'Kenyatta Ave', labelSecondary: 'Nyahururu Rd', city: 'Nakuru', landmarkName: 'Nakuru CBD' };
    } else {
      return { lat: -0.0917, lng: 34.7680, label: 'Jomo Kenyatta Hwy', labelSecondary: 'Kondele Bypass', city: 'Kisumu', landmarkName: 'Kisumu City' };
    }
  };

  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Custom interactive mock rendering
  useEffect(() => {
    if (hasValidKey) return; // Let Google Maps render

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;
    const drawMockMap = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const centerLat = customerLocation?.lat ?? -1.286389;
      const centerLng = customerLocation?.lng ?? 36.817223;
      const region = getRegionCenter(centerLat, centerLng);

      // Background - Land
      ctx.fillStyle = '#f8fafc'; // light slate
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Region specific bodies of water
      if (region.city === 'Kisumu') {
        ctx.fillStyle = '#e0f2fe'; // sky-100
        ctx.beginPath();
        ctx.arc(-20, 320, 180, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8'; // sky-400 text
        ctx.font = '10px monospace';
        ctx.fillText('LAKE VICTORIA', 20, 260);
      } else if (region.city === 'Mombasa') {
        ctx.fillStyle = '#e0f2fe';
        ctx.beginPath();
        ctx.arc(420, 320, 220, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText('INDIAN OCEAN', 280, 260);
      } else if (region.city === 'Nairobi') {
        ctx.fillStyle = '#dcfce7'; // green-100 park
        ctx.beginPath();
        ctx.arc(80, 100, 90, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#22c55e';
        ctx.font = '10px monospace';
        ctx.fillText('UHURU PARK', 40, 100);
      }

      // Draw Streets Grid layout
      ctx.strokeStyle = '#e2e8f0'; // slate-200
      ctx.lineWidth = 12;
      
      ctx.beginPath();
      ctx.moveTo(30, 100); ctx.lineTo(370, 100);
      ctx.moveTo(50, 200); ctx.lineTo(350, 200);
      ctx.moveTo(100, 30); ctx.lineTo(100, 270);
      ctx.moveTo(250, 40); ctx.lineTo(250, 280);
      ctx.moveTo(30, 40); ctx.lineTo(320, 300);
      ctx.stroke();

      // Street Labels
      ctx.fillStyle = '#94a3b8'; // slate-400
      ctx.font = 'italic 9px sans-serif';
      ctx.fillText(region.label, 110, 80);
      ctx.fillText(region.labelSecondary, 180, 160);
      ctx.fillText('Main Road Belt', 260, 220);

      // Markers mapping: customer fits around (250, 120)
      const custX = 250;
      const custY = 120;
      
      let fX = 100;
      let fY = 70;

      if (fundiLocation) {
        const dLat = fundiLocation.lat - centerLat;
        const dLng = fundiLocation.lng - centerLng;
        fX = 250 + (dLng * 15000);
        fY = 120 - (dLat * 15000);
      }

      // Draw route path if active tracking
      if (isTracking) {
        ctx.strokeStyle = '#f97316'; // orange-500 route
        ctx.lineWidth = 4;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(fX, fY);
        ctx.lineTo(custX, custY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Customer Marker (Deep Blue Pin)
      ctx.fillStyle = '#1e3a8a';
      ctx.beginPath();
      ctx.arc(custX, custY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(custX, custY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e3a8a';
      ctx.font = '700 8px sans-serif';
      ctx.fillText(`CLIENT (${region.landmarkName})`, custX + 12, custY + 3);

      // Fundi Marker (Orange dynamic tracking Pin)
      ctx.fillStyle = '#ea580c'; // intense orange
      ctx.beginPath();
      ctx.arc(fX, fY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(fX, fY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ea580c';
      ctx.font = '700 8px sans-serif';
      ctx.fillText('FUNDI (En Route)', fX + 12, fY + 3);

      animFrame = requestAnimationFrame(drawMockMap);
    };

    drawMockMap();
    return () => cancelAnimationFrame(animFrame);
  }, [customerLocation, fundiLocation, isTracking, hasValidKey]);

  return (
    <div id="map-container" className="w-full h-full relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800">
      {hasValidKey ? (
        <APIProvider apiKey={API_KEY} version="weekly">
          <Map
            defaultCenter={{ lat: defaultCenter.lat, lng: defaultCenter.lng }}
            defaultZoom={13}
            mapId="KAZIFY_LIVEMAP"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            style={{ width: '100%', height: '100%' }}
          >
            {/* Customer Marker */}
            <AdvancedMarker position={{ lat: defaultCenter.lat, lng: defaultCenter.lng }}>
              <Pin background="#1e3a8a" glyphColor="#fff" />
            </AdvancedMarker>

            {/* Fundi Marker */}
            {fundiLocation && (
              <AdvancedMarker position={{ lat: fundiLocation.lat, lng: fundiLocation.lng }}>
                <Pin background="#f97316" glyphColor="#fff" />
              </AdvancedMarker>
            )}
          </Map>
        </APIProvider>
      ) : (
        <div className="w-full h-full relative">
          <canvas
            ref={canvasRef}
            width={400}
            height={320}
            className="w-full h-full block"
          />

          <div className="absolute top-3 left-3 bg-slate-950/90 border border-slate-800/80 px-3 py-1.5 rounded-xl text-[10px] text-gray-400 font-mono shadow-md flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
            <span>Simulated Kenya Street Grid</span>
          </div>

          <div className="absolute bottom-3 right-3 max-w-[200px] bg-slate-950/90 border border-slate-800 p-2 text-[9px] leading-relaxed text-gray-400 rounded-lg shadow-md font-mono">
            <span className="text-orange-400 block font-semibold mb-0.5">Google Maps Offline</span>
            <span>Real Google Map supports the GM key in settings secrets block. See instruction guide.</span>
          </div>
        </div>
      )}
    </div>
  );
}
