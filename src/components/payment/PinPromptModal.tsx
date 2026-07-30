import React from 'react';
import { Sparkles } from 'lucide-react';
import { PaymentChannel } from '../../hooks/payment/usePaymentGateway';
import { Job } from '../../types';

interface PinPromptModalProps {
  channel: PaymentChannel;
  job: Job;
  pin: string;
  setPin: (val: string) => void;
  checkoutId: string;
  isCompletedJobFlow: boolean;
  handleSimulatePinAuth: () => void;
}

export const PinPromptModal: React.FC<PinPromptModalProps> = ({
  channel,
  job,
  pin,
  setPin,
  checkoutId,
  isCompletedJobFlow,
  handleSimulatePinAuth
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSimulatePinAuth();
  };

  return (
    <div className="flex flex-col md:flex-row items-center md:space-x-6 space-y-4 md:space-y-0 animate-in slide-in-from-bottom-3 duration-250">
      {/* Phone Screen Simulation Widget */}
      <div className={`w-[190px] border-4 ${
        channel === 'mpesa' ? 'border-emerald-550/80 bg-slate-950/98' : 'border-rose-950 bg-slate-950/98'
      } rounded-3xl p-3.5 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[240px] mx-auto select-none grow-0 shrink-0`}>
        
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-800 rounded-full" />
        
        <div className="flex justify-between text-[7px] font-mono text-slate-500 pt-2">
          <span>{channel === 'mpesa' ? 'Safaricom' : 'Airtel'}</span>
          <span>Active 5G</span>
        </div>

        {/* Popup frame */}
        <div className={`border rounded-xl p-2.5 my-2 text-left space-y-1.5 shadow-2xl ${
          channel === 'mpesa' 
            ? 'bg-emerald-950/95 border-emerald-500/40' 
            : 'bg-rose-950/95 border-rose-500/40'
        }`}>
          <span className={`text-[7px] font-mono uppercase tracking-widest block font-bold ${
            channel === 'mpesa' ? 'text-emerald-400' : 'text-rose-400'
          }`}>
            {channel === 'mpesa' ? 'M-PESA ESCROW' : 'AIRTEL SECURE'}
          </span>
          <p className="text-[8px] leading-tight text-white font-sans">
            {isCompletedJobFlow 
              ? `Pay KES ${(job?.amount || 0).toLocaleString()} directly to ${job.fundi_name || 'tradesman'}?`
              : `Lock KES ${(job?.amount || 0).toLocaleString()} in secure escrow?`
            }
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-1">
            <span className="text-[6.5px] text-slate-400 font-mono block">ENTER 4-DIGIT PIN</span>
            <input
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              className="w-full bg-slate-900 border border-slate-700 text-center py-0.5 rounded text-xs font-mono font-bold text-white focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={pin.length < 4}
              className={`w-full py-1 text-[8px] font-bold rounded transition cursor-pointer ${
                channel === 'mpesa' 
                  ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' 
                  : 'bg-rose-600 text-white hover:bg-rose-500'
              }`}
            >
              SEND PIN
            </button>
          </form>
        </div>

        <span className="text-[7px] text-center text-slate-600 block font-mono">HANDSET POPUP MOCK</span>
      </div>

      <div className="flex-1 text-left space-y-3.5">
        <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
          <span>Interactive Handset Prompt</span>
        </h5>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Our gateway fully emulates Safaricom/Airtel secure push callbacks. Enter any <strong className="text-white">4-digit PIN</strong> on the simulated mobile device to proceed safely.
        </p>
        
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 font-mono text-[10px]">
          <div className="text-slate-500 flex justify-between">
            <span>Merchant Log</span>
            <span className="text-slate-300">Daraja Tunnel</span>
          </div>
          <div className="text-slate-500 flex justify-between">
            <span>Checkout Request</span>
            <span className="text-slate-300 truncate max-w-[120px]">{checkoutId}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
