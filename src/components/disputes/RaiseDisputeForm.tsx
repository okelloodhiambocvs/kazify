import React from 'react';
import { 
  ShieldAlert, Upload, X, Percent, FileText, Sparkles 
} from 'lucide-react';
import { DisputeEvidenceAttachment } from '../../types';
import { PRESET_EVIDENCE_EXHIBITS } from '../../hooks/disputes/useDisputePanel';

interface RaiseDisputeFormProps {
  reason: string;
  setReason: (val: string) => void;
  description: string;
  setDescription: (val: string) => void;
  completionPercentage: number;
  setCompletionPercentage: (val: number) => void;
  attachments: DisputeEvidenceAttachment[];
  isRaising: boolean;
  error: string;
  setIsFormExpanded: (val: boolean) => void;
  currentCaption: string;
  setCurrentCaption: (val: string) => void;
  dragActive: boolean;
  handleDrag: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAttachPreset: (preset: typeof PRESET_EVIDENCE_EXHIBITS[0]) => void;
  removeAttachment: (id: string) => void;
  handleRaiseDispute: (e: React.FormEvent) => void;
}

export const RaiseDisputeForm: React.FC<RaiseDisputeFormProps> = ({
  reason,
  setReason,
  description,
  setDescription,
  completionPercentage,
  setCompletionPercentage,
  attachments,
  isRaising,
  error,
  setIsFormExpanded,
  currentCaption,
  setCurrentCaption,
  dragActive,
  handleDrag,
  handleDrop,
  handleFileChange,
  handleAttachPreset,
  removeAttachment,
  handleRaiseDispute
}) => {
  return (
    <form onSubmit={handleRaiseDispute} className="space-y-4">
      <div className="flex justify-between items-center pb-1 border-b border-slate-900">
        <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest">New Mediation Case File</span>
        <button
          type="button"
          onClick={() => setIsFormExpanded(false)}
          className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition cursor-pointer"
        >
          Cancel Case File
        </button>
      </div>

      <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl text-xs text-rose-300 font-mono leading-normal flex gap-2">
        <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
        <p>
          Warning: Raising a dispute suspends all escrow releases and alerts Kazify arbitration officers. All contract records, milestone dates, and message transcripts will be analyzed.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Reason selector */}
        <div>
          <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">REASON FOR DISPUTE</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white"
          >
            <option value="Unsatisfactory Quality of Work">Plumbing / Trades quality unsatisfactory</option>
            <option value="Work Incomplete / Abandoned">Tradesperson abandoned the site</option>
            <option value="Client Payment / Materials Delay">Material delivery delay / payment dispute</option>
            <option value="Contract Breached">Contract terms breach or behavioral issue</option>
            <option value="Other">Other conflicts (detailed below)</option>
          </select>
        </div>

        {/* Estimated work completed slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Percent className="w-3.5 h-3.5 text-orange-400" />
              Estimated Work Completed
            </label>
            <span className="text-xs font-mono font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-500/20">{completionPercentage}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="5"
            value={completionPercentage}
            onChange={(e) => setCompletionPercentage(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span className="text-[9px] font-mono text-slate-500 mt-1 block">Specify what fraction of the contracted scope is finished.</span>
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">EVIDENTIARY DESCRIPTION</label>
        <textarea
          rows={3}
          placeholder="Provide a detailed explanation of what transpired and the exact resolution you require (e.g. full refund, partial rework)."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 resize-none"
          required
        />
      </div>

      {/* Quick Preset Evidence Injector */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-mono font-semibold text-slate-400 block uppercase tracking-wider flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          Quick Sandbox Presets (Arbitration Simulator)
        </span>
        <p className="text-[9px] text-slate-500 font-sans leading-tight">
          Don't have photos on hand? Click any of these realistic Kenyan job-site incident scenarios to attach official evidence immediately.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {PRESET_EVIDENCE_EXHIBITS.map((p, idx) => (
            <button
              type="button"
              key={idx}
              onClick={() => handleAttachPreset(p)}
              className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-left cursor-pointer transition flex items-start gap-2 group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-950/80 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-800">
                <img src={p.url} className="w-full h-full object-cover group-hover:scale-110 transition" alt="Preset thumb" referrerPolicy="no-referrer" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <span className="text-[10px] text-slate-200 font-mono font-bold block truncate">{p.name}</span>
                <span className="text-[8px] text-slate-500 block truncate font-mono">{p.caption.substring(0, 30)}...</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Drag & Drop File Upload Box */}
      <div className="space-y-2">
        <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block text-slate-400">ATTACH VERIFIED EVIDENCE FILES (PHOTOS / WORK LOGS)</label>
        
        {/* Optional caption before dropping/clicking */}
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Write caption for next file uploaded (e.g. 'Leaking drain pipe beneath kitchen basin')..."
            value={currentCaption}
            onChange={(e) => setCurrentCaption(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-orange-500 text-white placeholder:text-slate-650"
          />
        </div>

        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
            dragActive 
              ? 'border-orange-500 bg-orange-500/10 text-orange-400' 
              : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 text-slate-400 hover:bg-slate-900/60'
          }`}
        >
          <input
            type="file"
            multiple
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Upload className="w-6 h-6 text-orange-400" />
          <div className="text-xs font-mono">
            <span className="font-bold text-white">Drag & drop files here</span> or click to browse local storage
          </div>
          <span className="text-[9px] font-mono text-slate-500">Supports PNG, JPEG, PDF up to 8MB</span>
        </div>
      </div>

      {/* Form attachments list */}
      {attachments.length > 0 && (
        <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl space-y-2">
          <div className="flex justify-between items-center pb-1.5 border-b border-slate-950 text-[10px] font-mono text-slate-400">
            <span>EVIDENCE GALLERY READY ({attachments.length})</span>
            <span className="text-orange-400 font-bold">WILL ATTACH ON DISPUTE SUBMISSION</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {attachments.map((att) => (
              <div key={att.id} className="p-2 bg-slate-950 border border-slate-850 rounded-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {att.file_type.startsWith('image/') ? (
                    <div className="w-10 h-10 rounded bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      <img src={att.file_url} className="w-full h-full object-cover" alt="Thumb" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded bg-orange-500/10 text-orange-400 flex-shrink-0 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-left font-mono">
                    <span className="text-[10px] text-slate-200 block truncate font-bold">{att.file_name}</span>
                    <span className="text-[9px] text-slate-500 block truncate leading-tight">{att.caption}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="text-rose-400 text-xs font-mono p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isRaising}
        className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-500/5"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>{isRaising ? 'LODGING LEGAL REQUEST...' : 'RAISE DISPUTE'}</span>
      </button>
    </form>
  );
};
