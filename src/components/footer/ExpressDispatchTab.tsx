import React, { useState } from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';

export const ExpressDispatchTab: React.FC = () => {
  const [expressCounty, setExpressCounty] = useState('Nairobi');
  const [expressTrade, setExpressTrade] = useState('Plumber');
  const [expressStatus, setExpressStatus] = useState<'idle' | 'searching' | 'dispatched'>('idle');
  const [expressProgress, setExpressProgress] = useState(0);

  const triggerExpressDispatch = () => {
    setExpressStatus('searching');
    setExpressProgress(0);
    const interval = setInterval(() => {
      setExpressProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setExpressStatus('dispatched');
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  return (
    <div className="space-y-4">
      <p>
        Kazify Express matches your critical emergency with verified emergency contractors carrying GPS tracking telemetry and mobile material kits.
      </p>

      <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 text-xs">
        <h4 className="font-bold text-orange-400 uppercase tracking-wider text-[11px]">⚡ Emergency Dispatch Console</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Target County</label>
            <select 
              value={expressCounty} 
              onChange={e => setExpressCounty(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
            >
              <option value="Nairobi">Nairobi Metropolitan</option>
              <option value="Kisumu">Kisumu Urban</option>
              <option value="Mombasa">Mombasa Island</option>
              <option value="Nakuru">Nakuru CBD</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-1">Trade Specialty</label>
            <select 
              value={expressTrade} 
              onChange={e => setExpressTrade(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-white"
            >
              <option value="Plumber">Emergency Plumbing (Leak Repair)</option>
              <option value="Electrician">Electrical Blackout / Short</option>
              <option value="Locksmith">Locksmith / Door Breach</option>
              <option value="HVAC">HVAC & Solar Power Failure</option>
            </select>
          </div>
        </div>

        {expressStatus === 'idle' && (
          <button 
            onClick={triggerExpressDispatch}
            className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold py-2 rounded-lg transition duration-200 flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <span>Simulate 30-Minute Express Dispatch</span>
          </button>
        )}

        {expressStatus === 'searching' && (
          <div className="space-y-2 py-2">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-orange-400">Pinging Nearest Registered {expressTrade}s...</span>
              <span>{expressProgress}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-orange-500 h-full transition-all duration-300" style={{ width: `${expressProgress}%` }} />
            </div>
          </div>
        )}

        {expressStatus === 'dispatched' && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg space-y-1">
            <div className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Contractor Dispatched! ETA: 18 Minutes</span>
            </div>
            <p className="text-[10px] text-emerald-300">
              Master Fundi <strong>David Otieno</strong> assigned to {expressCounty} location. M-PESA escrow pre-authorization code sent to your phone.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
