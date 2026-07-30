import React from 'react';
import { CheckCircle2, AlertTriangle, Eye, Send, X } from 'lucide-react';
import { User } from '../../types';

interface AdminDisputesBoardProps {
  user: User;
  disputes: any[];
  selectedDispute: any | null;
  setSelectedDispute: (d: any | null) => void;
  disputeMessages: any[];
  newDisputeMsg: string;
  setNewDisputeMsg: (msg: string) => void;
  resSummary: string;
  setResSummary: (s: string) => void;
  isResolving: boolean;
  adminZoomExhibit: any | null;
  setAdminZoomExhibit: (e: any | null) => void;
  handleSendDisputeMessage: (e: React.FormEvent) => void;
  handleResolveDispute: (resolution: 'resolved_released' | 'resolved_refunded') => void;
}

export default function AdminDisputesBoard({
  user,
  disputes,
  selectedDispute,
  setSelectedDispute,
  disputeMessages,
  newDisputeMsg,
  setNewDisputeMsg,
  resSummary,
  setResSummary,
  isResolving,
  adminZoomExhibit,
  setAdminZoomExhibit,
  handleSendDisputeMessage,
  handleResolveDispute
}: AdminDisputesBoardProps) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-150">
        {/* Disputes List */}
        <div className="lg:col-span-5 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4">
          <h3 className="font-display font-bold text-base text-white">Active Arbitration Claims</h3>
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {disputes.length === 0 ? (
              <div className="text-center py-20 text-slate-500 font-mono text-xs">
                No disputes lodged on the marketplace
              </div>
            ) : (
              disputes.map((d) => (
                <div
                  key={d.id}
                  onClick={() => setSelectedDispute(d)}
                  className={`p-4 rounded-2xl border cursor-pointer transition ${
                    selectedDispute?.id === d.id ? 'bg-slate-900 border-orange-500/80' : 'bg-slate-950 border-slate-800/80 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-[9px] text-slate-500 block uppercase">ID: #{d.id.substring(0, 8)}</span>
                    <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-mono font-bold border ${
                      d.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {d.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-white mt-2 block truncate">{d.reason}</h4>
                  <p className="text-[11px] text-slate-400 mt-1 leading-normal line-clamp-2">{d.description}</p>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono mt-3 border-t border-slate-900 pt-2">
                    <span>Job Amount: KES {(d.amount || 0).toLocaleString()}</span>
                    <span>{d.customer_name}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat & Arbitration Console */}
        <div className="lg:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-4 flex flex-col justify-between min-h-[540px]">
          {selectedDispute ? (
            <>
              <div className="border-b border-slate-900 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="font-display font-bold text-sm text-white">Arbitration Desk: Case #{selectedDispute.id.substring(0, 10)}</h3>
                  <span className="text-[10px] font-mono text-slate-500">Initiator: {selectedDispute.initiator_name}</span>
                </div>
                <button 
                  onClick={() => setSelectedDispute(null)}
                  className="text-xs font-mono text-slate-400 hover:text-white"
                >
                  Close Desk
                </button>
              </div>

              <div className="p-3.5 bg-slate-900/40 border border-slate-800 rounded-xl text-xs space-y-1">
                <span className="text-[9px] font-mono font-bold text-orange-400 block uppercase">LODGED CLAIM CLAIM STATEMENT</span>
                <strong className="text-white block">{selectedDispute.reason}</strong>
                <p className="text-slate-400 leading-normal">{selectedDispute.description}</p>
              </div>

              {selectedDispute.completion_percentage !== undefined && (
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl font-mono text-[10px] space-y-1">
                  <div className="flex justify-between items-center text-[9px]">
                    <span className="text-slate-400 font-bold uppercase">ESTIMATED PROGRESS (CLAIMED BY CLIENT)</span>
                    <span className="text-orange-400 font-bold">{selectedDispute.completion_percentage}% Completed</span>
                  </div>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-850">
                    <div 
                      className="bg-orange-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${selectedDispute.completion_percentage}%` }}
                    />
                  </div>
                </div>
              )}

              {selectedDispute.evidence_attachments && selectedDispute.evidence_attachments.length > 0 && (
                <div className="p-3 bg-slate-900/30 border border-slate-850 rounded-xl space-y-2 text-xs">
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">CLIENT EVIDENTIARY EXHIBITS ({selectedDispute.evidence_attachments.length})</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedDispute.evidence_attachments.map((att: any) => (
                      <div 
                        key={att.id} 
                        className="p-1.5 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between gap-2 hover:border-slate-800 transition"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                          {att.file_type?.startsWith('image/') || att.file_url?.startsWith('http') ? (
                            <div className="w-8 h-8 rounded bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-800">
                              <img src={att.file_url} className="w-full h-full object-cover" alt="Evidence" referrerPolicy="no-referrer" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded bg-orange-500/15 text-orange-400 flex-shrink-0 flex items-center justify-center font-bold text-[8px] font-mono">
                              DOC
                            </div>
                          )}
                          <div className="min-w-0 flex-1 font-mono text-[9px] leading-tight">
                            <span className="text-slate-200 block truncate font-bold">{att.file_name}</span>
                            <span className="text-slate-500 block truncate">{att.caption || 'Arbitration Exhibit'}</span>
                          </div>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setAdminZoomExhibit(att)}
                          className="p-1 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Messages Log */}
              <div className="border border-slate-850 bg-slate-950 rounded-xl p-4 flex-1 h-56 overflow-y-auto space-y-3">
                {disputeMessages.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 font-mono text-xs">
                    No official communication logs yet
                  </div>
                ) : (
                  disputeMessages.map((m) => (
                    <div key={m.id} className={`flex flex-col ${m.sender_id === user.id ? 'items-end' : 'items-start'}`}>
                      <div className={`p-2.5 rounded-xl max-w-[85%] text-xs text-left ${m.sender_id === user.id ? 'bg-orange-500 text-slate-950 rounded-tr-none' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'}`}>
                        <span className="text-[9px] font-mono block font-bold opacity-60 mb-0.5 uppercase">{m.sender_name}</span>
                        <p className="leading-normal">{m.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Actions Panel */}
              {selectedDispute.status === 'pending' ? (
                <div className="space-y-3 pt-2">
                  {/* Send message */}
                  <form onSubmit={handleSendDisputeMessage} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Type official arbitrator instructions..."
                      value={newDisputeMsg}
                      onChange={(e) => setNewDisputeMsg(e.target.value)}
                      aria-label="Type official arbitrator instructions message"
                      className="flex-1 bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                    <button type="submit" aria-label="Send arbitrator instructions message" className="p-2.5 bg-slate-900 border border-slate-800 hover:border-orange-500 text-orange-400 rounded-xl transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus:outline-none">
                      <Send className="w-4 h-4" />
                    </button>
                  </form>

                  {/* Resolve controls */}
                  <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
                    <span className="text-[9px] font-mono font-bold text-rose-400 block uppercase tracking-widest">JUDICIAL RULING DESK</span>
                    <input
                      type="text"
                      placeholder="Enter rationale summary statement..."
                      value={resSummary}
                      onChange={(e) => setResSummary(e.target.value)}
                      aria-label="Enter rationale summary statement"
                      className="w-full bg-slate-950 border border-slate-850 text-white text-xs rounded-xl px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      required
                    />
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <button
                        onClick={() => handleResolveDispute('resolved_released')}
                        disabled={isResolving || !resSummary.trim()}
                        aria-label="Resolve dispute and release funds to expert"
                        className="py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold disabled:opacity-40 cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                      >
                        RELEASE TO EXPERT
                      </button>
                      <button
                        onClick={() => handleResolveDispute('resolved_refunded')}
                        disabled={isResolving || !resSummary.trim()}
                        aria-label="Resolve dispute and refund funds to client"
                        className="py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold disabled:opacity-40 cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                      >
                        REFUND TO CLIENT
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-400 text-xs font-mono text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <span className="font-bold block text-[10px] uppercase">RULING FINALIZED</span>
                    <p className="text-[10px] mt-0.5">{selectedDispute.resolution_summary}</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
              <AlertTriangle className="w-10 h-10 text-slate-700 mb-3" />
              <span className="text-xs font-mono">Select an active conflict claim to open the arbitration desk</span>
            </div>
          )}
        </div>
      </div>

      {/* Admin Zoom Evidence Modal */}
      {adminZoomExhibit && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative bg-slate-950 max-w-2xl w-full border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-950">
              <span className="text-xs font-mono font-bold text-slate-300 truncate max-w-[80%]">ADMIN COURT EXHIBIT: {adminZoomExhibit.file_name}</span>
              <button 
                onClick={() => setAdminZoomExhibit(null)}
                className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-900 flex items-center justify-center p-2 min-h-[300px] max-h-[480px] overflow-hidden">
              <img 
                src={adminZoomExhibit.file_url} 
                alt="Court Evidence Exhibit" 
                className="max-w-full max-h-[440px] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-900 space-y-1 text-left">
              <span className="text-[9px] font-mono text-orange-400 block font-bold uppercase tracking-widest">Exhibit Caption / Explanation</span>
              <p className="text-xs text-slate-200 leading-relaxed font-mono">{adminZoomExhibit.caption || "No caption added."}</p>
              <div className="text-[8px] text-slate-500 font-mono pt-1.5 border-t border-slate-900 mt-2">
                LODGING TIMESTAMP: {new Date(adminZoomExhibit.uploaded_at).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
