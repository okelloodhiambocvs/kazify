import React from 'react';
import { ShieldCheck, Receipt } from 'lucide-react';
import { PaymentChannel } from '../../hooks/payment/usePaymentGateway';
import { Job } from '../../types';

interface PaymentSuccessViewProps {
  job: Job;
  channel: PaymentChannel;
  txReceipt: string;
  isCompletedJobFlow: boolean;
  onClose?: () => void;
}

export const PaymentSuccessView: React.FC<PaymentSuccessViewProps> = ({
  job,
  channel,
  txReceipt,
  isCompletedJobFlow,
  onClose
}) => {
  return (
    <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
      <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
        <ShieldCheck className="w-7 h-7" />
      </div>
      
      <div className="space-y-1.5">
        <h5 className="text-sm font-bold text-white">
          {isCompletedJobFlow 
            ? 'Payment Settled Successfully!' 
            : 'Escrow Funds Secured Successfully!'
          }
        </h5>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">
          {isCompletedJobFlow
            ? `KES ${(job?.amount || 0).toLocaleString()} on-demand payout was delivered directly to ${job.fundi_name || 'tradesperson'}'s registered wallet.`
            : `K Kazify secured KES ${(job?.amount || 0).toLocaleString()} inside Kazify Escrow Vault. An interactive regional dispatch notification has been targeted to verified experts.`
          }
        </p>
      </div>

      {/* Receipt ledger widget */}
      <div className="bg-slate-900/80 border border-slate-850 rounded-2xl p-4 max-w-sm mx-auto text-left font-mono space-y-2 text-[10px]">
        <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2 mb-1.5">
          <Receipt className="w-3.5 h-3.5 text-orange-500" />
          <span className="font-bold text-slate-300">OFFICIAL SERVICE RECEIPT</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">TRANSACTION ID</span>
          <span className="text-white font-bold">{txReceipt}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">PROVIDER</span>
          <span className="text-white uppercase font-bold">{channel.toUpperCase()} SECURE</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">SETTLEMENT TYPE</span>
          <span className={`font-bold ${isCompletedJobFlow ? 'text-orange-400' : 'text-emerald-400'}`}>
            {isCompletedJobFlow ? 'DIRECT DISBURSEMENT' : 'ESCROW HOLD'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">RECIPIENT NAME</span>
          <span className="text-white font-bold">{job.fundi_name || 'PENDING DISPATCH'}</span>
        </div>
      </div>

      <button
        onClick={onClose}
        className="px-6 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white rounded-xl text-xs font-mono transition cursor-pointer"
      >
        Continue to Dashboard
      </button>
    </div>
  );
};
