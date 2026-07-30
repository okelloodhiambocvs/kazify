import React, { useState } from 'react';
import { Truck, Search, ShieldCheck, MapPin, CheckCircle2 } from 'lucide-react';

export const TrackJobTab: React.FC = () => {
  const [trackJobId, setTrackJobId] = useState('JOB-2026-8841');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);

  const handleTrackJob = (e: React.FormEvent) => {
    e.preventDefault();
    setIsTracking(true);
    setTrackingResult(null);

    setTimeout(() => {
      setIsTracking(false);
      const isMatch = trackJobId.trim().toUpperCase().startsWith('JOB-');
      setTrackingResult({
        id: trackJobId.toUpperCase(),
        exists: true,
        status: isMatch ? 'In Escrow Progress' : 'Completed',
        customer: 'House Ventures Ltd',
        fundi: 'James Ouko (Certified Plumber)',
        county: 'Kisumu County',
        location: 'Milimani Estate, Kisumu',
        amount: 'KES 14,500.00',
        stage: 2,
        updatedAt: new Date().toLocaleDateString(),
        escrowLocked: true,
        timeline: [
          { title: 'Escrow Account Funded', desc: 'Secure payment received via Lipa Na M-PESA. Money held in safekeeping.', time: '09:14 AM' },
          { title: 'Tradesperson Dispatched', desc: 'James Ouko dispatched to Milimani Estate. Transit tracked via GPS.', time: '11:30 AM' },
          { title: 'Work In Progress', desc: 'Materials unboxed, structural fitting initiated.', time: '02:45 PM' }
        ]
      });
    }, 1200);
  };

  return (
    <div className="space-y-4">
      <p>
        Track the real-time status of active work orders, material dispatches, or escrow milestone releases across Kenya.
      </p>

      <form onSubmit={handleTrackJob} className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Enter Job Order / Escrow Reference ID:</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Truck className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              value={trackJobId}
              onChange={e => setTrackJobId(e.target.value)}
              placeholder="e.g. JOB-2026-8841" 
              required
              className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs font-mono dark:text-white"
            />
          </div>
          <button 
            type="submit" 
            disabled={isTracking}
            className="bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1.5 transition duration-200 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isTracking ? 'Searching...' : 'Track'}</span>
          </button>
        </div>
      </form>

      {trackingResult && (
        <div className="p-4 bg-slate-950 text-white rounded-xl border border-slate-800 space-y-3 font-mono text-xs animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-orange-400 font-bold">{trackingResult.id}</span>
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
              {trackingResult.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div><span className="text-slate-500">Client:</span> {trackingResult.customer}</div>
            <div><span className="text-slate-500">Fundi:</span> {trackingResult.fundi}</div>
            <div><span className="text-slate-500">Location:</span> {trackingResult.location}</div>
            <div><span className="text-slate-500">Escrow Locked:</span> {trackingResult.amount}</div>
          </div>

          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] text-slate-400 uppercase font-bold block mb-2">Live Milestones:</span>
            <div className="space-y-2 pl-2 border-l-2 border-orange-500">
              {trackingResult.timeline.map((item: any, idx: number) => (
                <div key={idx} className="relative pl-3">
                  <div className="absolute -left-[13px] top-1 w-2 h-2 rounded-full bg-orange-500" />
                  <div className="flex justify-between font-bold text-slate-200">
                    <span>{item.title}</span>
                    <span className="text-[9px] text-slate-500">{item.time}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
