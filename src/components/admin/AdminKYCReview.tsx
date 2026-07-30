import React from 'react';
import { ShieldCheck } from 'lucide-react';

interface AdminKYCReviewProps {
  kycDocs: any[];
  selectedKyc: any | null;
  setSelectedKyc: (doc: any | null) => void;
  rejReason: string;
  setRejReason: (reason: string) => void;
  handleReviewKyc: (docId: string, status: 'approved' | 'rejected') => void;
}

export default function AdminKYCReview({
  kycDocs,
  selectedKyc,
  setSelectedKyc,
  rejReason,
  setRejReason,
  handleReviewKyc
}: AdminKYCReviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
      {/* KYC Document list */}
      <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4">
        <h3 className="font-display font-bold text-base text-white">KYC & Identity Backlog</h3>
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {kycDocs.length === 0 ? (
            <div className="text-center py-20 text-slate-500 font-mono text-xs">
              No KYC identity documents submitted
            </div>
          ) : (
            kycDocs.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedKyc(doc)}
                className={`p-4 rounded-2xl border cursor-pointer transition ${
                  selectedKyc?.id === doc.id ? 'bg-slate-900 border-orange-500/80' : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-[9px] text-slate-500 block uppercase">{doc.document_type.replace('_', ' ')}</span>
                  <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-mono font-bold border ${
                    doc.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                    doc.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {doc.status}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-white mt-2 block truncate">Number: {doc.document_number}</h4>
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-900 pt-2">
                  <span>User: {doc.user_name} ({doc.user_role?.toUpperCase()})</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* KYC Review Details & Controls */}
      <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4 flex flex-col justify-between min-h-[500px]">
        {selectedKyc ? (
          <>
            <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-sm text-white">Reviewing credentials for {selectedKyc.user_name}</h3>
                <span className="text-[10px] font-mono text-slate-500">Contact: {selectedKyc.user_email || selectedKyc.user_phone || 'None'}</span>
              </div>
              <button 
                onClick={() => setSelectedKyc(null)}
                className="text-xs font-mono text-slate-400 hover:text-white"
              >
                Close Review
              </button>
            </div>

            <div className="space-y-4">
              {/* Document Meta Info */}
              <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Document Type:</span>
                  <span className="text-white capitalize">{selectedKyc.document_type.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">ID Serial:</span>
                  <span className="text-white">{selectedKyc.document_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Logged Date:</span>
                  <span className="text-white">{new Date(selectedKyc.created_at).toLocaleString()}</span>
                </div>
              </div>

              {/* Image Preview */}
              <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-900 h-60 relative">
                <img
                  referrerPolicy="no-referrer"
                  src={selectedKyc.file_url || "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500"}
                  alt="ID Preview scan"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Action Controls */}
            {selectedKyc.status === 'pending' ? (
              <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-xl space-y-3">
                <span className="text-[9px] font-mono font-bold text-orange-400 block uppercase tracking-widest">VERIFICATION SIGN-OFF</span>
                <input
                  type="text"
                  placeholder="Specify reason ONLY if rejecting document..."
                  value={rejReason}
                  onChange={(e) => setRejReason(e.target.value)}
                  aria-label="Specify reason for document rejection"
                  className="w-full bg-slate-950 border border-slate-850 text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleReviewKyc(selectedKyc.id, 'approved')}
                    aria-label="Approve KYC credentials document"
                    className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                  >
                    APPROVE CREDENTIALS
                  </button>
                  <button
                    onClick={() => handleReviewKyc(selectedKyc.id, 'rejected')}
                    aria-label="Reject KYC credentials document with reason"
                    className="py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                  >
                    REJECT CREDENTIALS
                  </button>
                </div>
              </div>
            ) : (
              <div className={`p-4 rounded-xl text-center text-xs font-mono border ${
                selectedKyc.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' : 'bg-rose-500/5 border-rose-500/15 text-rose-400'
              }`}>
                {selectedKyc.status === 'approved' ? (
                  <span>Identity cleared and verified on secure directories.</span>
                ) : (
                  <span>Document rejected. Reason: {selectedKyc.rejection_reason || 'Incomplete details.'}</span>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
            <ShieldCheck className="w-10 h-10 text-slate-700 mb-3" />
            <span className="text-xs font-mono">Select a submitted credential to open the verification panel</span>
          </div>
        )}
      </div>
    </div>
  );
}
