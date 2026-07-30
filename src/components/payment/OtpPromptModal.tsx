import React from 'react';
import { Job } from '../../types';

interface OtpPromptModalProps {
  job: Job;
  otpCode: string;
  setOtpCode: (val: string) => void;
  handleSimulateOtpAuth: () => void;
}

export const OtpPromptModal: React.FC<OtpPromptModalProps> = ({
  job,
  otpCode,
  setOtpCode,
  handleSimulateOtpAuth
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSimulateOtpAuth();
  };

  return (
    <div className="flex flex-col md:flex-row items-center md:space-x-6 space-y-4 md:space-y-0 animate-in slide-in-from-bottom-3 duration-250">
      {/* Phone SMS simulation */}
      <div className="w-[190px] border-4 border-orange-950 bg-slate-950 rounded-3xl p-3.5 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[240px] mx-auto select-none grow-0 shrink-0">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-800 rounded-full" />
        
        <div className="flex justify-between text-[7px] font-mono text-slate-500 pt-2">
          <span>SMS Inbox</span>
          <span>Active 5G</span>
        </div>

        {/* SMS bubble popup */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-left space-y-1 my-3 shadow-2xl">
          <span className="text-[7px] font-mono text-orange-400 font-bold block uppercase">VERIFICATION SMS</span>
          <p className="text-[7.5px] leading-snug text-slate-300 font-sans">
            KAZIFY-CARD SECURE: Use <strong>882910</strong> to authorize KES {(job?.amount || 0).toLocaleString()}. Ref: {job.id.slice(-6)}.
          </p>
        </div>

        <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-left space-y-1">
          <form onSubmit={handleSubmit} className="space-y-1">
            <span className="text-[7px] text-slate-500 font-mono block uppercase">ENTER SMS CODE</span>
            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="882910"
              className="w-full bg-slate-900 border border-slate-800 text-center py-1 rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-orange-500"
              autoFocus
            />
            <button
              type="submit"
              disabled={otpCode.length < 6}
              className="w-full py-1 text-[8px] bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded transition cursor-pointer"
            >
              SUBMIT CARD OTP
            </button>
          </form>
        </div>

        <span className="text-[7px] text-center text-slate-600 block font-mono">SECURE OTP SIMULATOR</span>
      </div>

      <div className="flex-1 text-left space-y-3">
        <h5 className="text-sm font-bold text-white">Three-Domain Card OTP</h5>
        <p className="text-xs text-slate-400 leading-relaxed font-sans">
          Our gateway requires secondary authentication to settle debit card balances. Enter the 6-digit mock security token <strong className="text-orange-400 font-mono">882910</strong> sent in the simulated message on the smartphone.
        </p>
      </div>
    </div>
  );
};
