import React from 'react';
import { X } from 'lucide-react';
import { DisputeEvidenceAttachment } from '../../types';

interface DisputeEvidenceModalProps {
  activeZoomExhibit: DisputeEvidenceAttachment | null;
  onClose: () => void;
}

export const DisputeEvidenceModal: React.FC<DisputeEvidenceModalProps> = ({ activeZoomExhibit, onClose }) => {
  if (!activeZoomExhibit) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative bg-slate-950 max-w-2xl w-full border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-950">
          <span className="text-xs font-mono font-bold text-slate-300 truncate max-w-[80%]">EXHIBIT IMAGE: {activeZoomExhibit.file_name}</span>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="bg-slate-900 flex items-center justify-center p-2 min-h-[300px] max-h-[480px] overflow-hidden">
          <img 
            src={activeZoomExhibit.file_url} 
            alt="Evidence View" 
            className="max-w-full max-h-[440px] object-contain rounded-lg"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="p-4 bg-slate-950 border-t border-slate-900 space-y-1">
          <span className="text-[9px] font-mono text-orange-400 block font-bold uppercase tracking-widest">Client Provided Caption</span>
          <p className="text-xs text-slate-200 leading-relaxed font-mono">{activeZoomExhibit.caption || "No caption added."}</p>
        </div>
      </div>
    </div>
  );
};
