import React from 'react';
import { PaymentChannel } from '../../hooks/payment/usePaymentGateway';

interface PaymentChannelTabsProps {
  channel: PaymentChannel;
  setChannel: (channel: PaymentChannel) => void;
}

export const PaymentChannelTabs: React.FC<PaymentChannelTabsProps> = ({ channel, setChannel }) => {
  return (
    <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-900">
      <button
        type="button"
        onClick={() => setChannel('mpesa')}
        className={`py-2 px-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
          channel === 'mpesa' 
            ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-500/10' 
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <span>M-PESA</span>
        <span className="text-[7px] opacity-80">(STK)</span>
      </button>
      <button
        type="button"
        onClick={() => setChannel('wallet')}
        className={`py-2 px-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
          channel === 'wallet' 
            ? 'bg-orange-500 text-slate-950 font-extrabold shadow-md shadow-orange-500/10' 
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <span>MY WALLET</span>
        <span className="text-[7px] opacity-80">(Balance)</span>
      </button>
      <button
        type="button"
        onClick={() => setChannel('card')}
        className={`py-2 px-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
          channel === 'card' 
            ? 'bg-slate-750 text-white font-extrabold' 
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <span>CARD</span>
        <span className="text-[7px] opacity-80">(Visa/MC)</span>
      </button>
      <button
        type="button"
        onClick={() => setChannel('airtel')}
        className={`py-2 px-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
          channel === 'airtel' 
            ? 'bg-rose-600 text-white font-extrabold shadow-md shadow-rose-600/10' 
            : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
      >
        <span>AIRTEL</span>
        <span className="text-[7px] opacity-80">(STK)</span>
      </button>
    </div>
  );
};
