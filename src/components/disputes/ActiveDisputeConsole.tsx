import React from 'react';
import { 
  CheckCircle2, MessageSquare, Send, Eye, FileText 
} from 'lucide-react';
import { User, Dispute, DisputeMessage, DisputeEvidenceAttachment } from '../../types';

interface ActiveDisputeConsoleProps {
  dispute: Dispute;
  user: User;
  messages: DisputeMessage[];
  messagesEndRef: React.RefObject<HTMLDivElement>;
  setActiveZoomExhibit: (attachment: DisputeEvidenceAttachment) => void;
  newMessage: string;
  setNewMessage: (msg: string) => void;
  sendingMessage: boolean;
  handleSendMessage: (e: React.FormEvent) => void;
}

export const ActiveDisputeConsole: React.FC<ActiveDisputeConsoleProps> = ({
  dispute,
  user,
  messages,
  messagesEndRef,
  setActiveZoomExhibit,
  newMessage,
  setNewMessage,
  sendingMessage,
  handleSendMessage
}) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
          <span className="text-slate-500 block uppercase">ARBITRATION STATUS</span>
          <span className={`font-bold block mt-1 uppercase ${
            dispute.status === 'pending' ? 'text-amber-400 animate-pulse' :
            dispute.status.startsWith('resolved') ? 'text-emerald-400' : 'text-slate-400'
          }`}>
            ● {dispute.status.replace('_', ' ')}
          </span>
        </div>
        <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
          <span className="text-slate-500 block uppercase">LODGED BY</span>
          <span className="font-bold text-white block truncate mt-1">{dispute.initiator_name}</span>
        </div>
      </div>

      {/* Estimated progress status */}
      {dispute.completion_percentage !== undefined && (
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl font-mono">
          <div className="flex justify-between items-center text-[10px] mb-1">
            <span className="text-slate-400 font-bold uppercase">Estimated Job Progress Claimed</span>
            <span className="text-orange-400 font-bold">{dispute.completion_percentage}% Done</span>
          </div>
          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
            <div 
              className="bg-orange-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${dispute.completion_percentage}%` }}
            />
          </div>
          <span className="text-[8px] text-slate-500 mt-1 block">Arbitrator reviews this percentage relative to funds deposited in the Escrow wallet.</span>
        </div>
      )}

      {/* Dispute Claim statement */}
      <div className="p-3.5 bg-slate-900/50 border border-slate-850 rounded-xl text-xs space-y-1">
        <span className="text-[9px] font-mono font-bold text-orange-400 uppercase tracking-widest block">CLAIM STATEMENT</span>
        <span className="font-bold text-slate-200 block">{dispute.reason}</span>
        <p className="text-slate-400 leading-normal">{dispute.description}</p>
      </div>

      {/* Render Evidence Attachments in Active Console */}
      {dispute.evidence_attachments && dispute.evidence_attachments.length > 0 && (
        <div className="p-3.5 bg-slate-900/30 border border-slate-850 rounded-xl space-y-2 text-xs">
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">EVIDENTIARY ATTACHMENTS ({dispute.evidence_attachments.length})</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {dispute.evidence_attachments.map((att) => (
              <div 
                key={att.id} 
                className="p-2 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between gap-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {att.file_type?.startsWith('image/') || att.file_url.startsWith('http') ? (
                    <div className="w-10 h-10 rounded bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-800">
                      <img src={att.file_url} className="w-full h-full object-cover" alt="Evidence" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded bg-orange-500/15 text-orange-400 flex-shrink-0 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 font-mono text-left text-[10px]">
                    <span className="text-slate-200 block truncate font-bold">{att.file_name}</span>
                    <span className="text-slate-500 block truncate leading-snug">{att.caption || 'Arbitration Exhibit'}</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  onClick={() => setActiveZoomExhibit(att)}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dispute chat log */}
      <div className="border border-slate-850 rounded-xl p-3 bg-slate-950 flex flex-col h-48">
        <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 block text-center">ARBITRATION CHAT MESSAGES</span>
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
          {messages.length === 0 ? (
            <div className="text-center py-10 text-slate-600 font-mono text-[11px] flex flex-col items-center">
              <MessageSquare className="w-6 h-6 text-slate-750 mb-1.5" />
              <span>No dispute entries filed yet. Use chat below to communicate with the administrator.</span>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={`flex flex-col ${m.sender_id === user.id ? 'items-end' : 'items-start'}`}>
                <div className={`p-2.5 rounded-xl max-w-[80%] text-left ${m.sender_id === user.id ? 'bg-orange-500 text-slate-950 rounded-tr-none font-medium' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'}`}>
                  <span className="text-[9px] font-mono block font-bold opacity-60 mb-0.5 uppercase">{m.sender_name}</span>
                  <p className="leading-normal">{m.message}</p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Send message form */}
      {dispute.status === 'pending' ? (
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="Enter message for administrator arbitration review..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-900 border border-slate-800 text-white placeholder:text-slate-650"
            required
          />
          <button
            type="submit"
            disabled={sendingMessage}
            className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 transition active:scale-95 cursor-pointer flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      ) : (
        <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-400 text-xs font-mono text-center flex items-center justify-center gap-2">
          <CheckCircle2 className="w-4.5 h-4.5" />
          <span>Resolved: {dispute.resolution_summary || 'Case settled by arbitration board.'}</span>
        </div>
      )}
    </div>
  );
};
