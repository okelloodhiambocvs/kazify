import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { Layers } from 'lucide-react';

interface MapViewProps {
  API_KEY: string;
  hasValidKey: boolean;
  lat: number;
  lng: number;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  hoverDistrict: string;
  setHoverDistrict: (val: string) => void;
  handleMapClick: (e: any) => void;
  handleCanvasClick: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  API_KEY,
  hasValidKey,
  lat,
  lng,
  canvasRef,
  hoverDistrict,
  setHoverDistrict,
  handleMapClick,
  handleCanvasClick,
  handleCanvasMouseMove
}) => {
  return (
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
  );
};
