import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export const CareersFormTab: React.FC = () => {
  const [applyRole, setApplyRole] = useState('Sell on Kazify');
  const [applyFullName, setApplyFullName] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [applyCounty, setApplyCounty] = useState('Kisumu');
  const [applySuccess, setApplySuccess] = useState(false);

  const handleApplicationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApplySuccess(true);
    setTimeout(() => {
      setApplySuccess(false);
      setApplyFullName('');
      setApplyPhone('');
    }, 4000);
  };

  return (
    <div className="space-y-4">
      <p>
        We are looking for passionate builders, safety engineers, operations leaders, and community evangelists to join our distributed teams in Kisumu, Nairobi, and Mombasa.
      </p>
      <h4 className="font-bold text-xs text-orange-500 uppercase tracking-widest">Active Openings (2026)</h4>
      <div className="space-y-2 text-xs">
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <span className="font-bold block">Mobile App Developer (React Native / iOS)</span>
            <span className="text-slate-400 text-[10px]">Kisumu HQ / Hybrid</span>
          </div>
          <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-[10px] font-bold">FULL-TIME</span>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <span className="font-bold block">Regional Escrow Quality & Fraud Auditor</span>
            <span className="text-slate-400 text-[10px]">Nairobi Central / On-Site</span>
          </div>
          <span className="bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded text-[10px] font-bold">URGENT</span>
        </div>
        <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <div>
            <span className="font-bold block">County Onboarding Agent (NITA Vocations Lead)</span>
            <span className="text-slate-400 text-[10px]">All 47 Counties / Remote field operations</span>
          </div>
          <span className="bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded text-[10px] font-bold">FLEXIBLE</span>
        </div>
      </div>

      <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-left space-y-3">
        <span className="text-orange-500 text-[10px] font-mono font-bold block uppercase tracking-wider">⚡ QUICK TALENT FORM</span>
        {applySuccess ? (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Application successfully submitted! Our regional HR lead will reach out on your mobile.</span>
          </div>
        ) : (
          <form onSubmit={handleApplicationSubmit} className="space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="text" 
                placeholder="Full Legal Name" 
                value={applyFullName}
                onChange={e => setApplyFullName(e.target.value)}
                required
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
              />
              <input 
                type="tel" 
                placeholder="M-Pesa Mobile Number" 
                value={applyPhone}
                onChange={e => setApplyPhone(e.target.value)}
                required
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={applyCounty} 
                onChange={e => setApplyCounty(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
              >
                <option value="Kisumu">Kisumu County</option>
                <option value="Nairobi">Nairobi County</option>
                <option value="Mombasa">Mombasa County</option>
                <option value="Nakuru">Nakuru County</option>
              </select>
              <select 
                value={applyRole} 
                onChange={e => setApplyRole(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-white"
              >
                <option value="Technical Staff">Engineering Role</option>
                <option value="Regional Manager">Quality Auditor</option>
                <option value="Marketing Lead">County Agent</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-slate-950 font-bold py-1.5 rounded-lg text-xs transition duration-200">
              Submit Candidate Portfolio
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
