import React from 'react';
import { Briefcase, Navigation, Play, CheckCircle, MessageSquare, Send } from 'lucide-react';
import { User, Job, ChatMessage } from '../../types';
import ContractSignCard from '../ContractSignCard';
import DisputePanel from '../DisputePanel';
import BidForm from './BidForm';

interface FundiActiveJobsProps {
  user: User;
  selectedJob: Job | null;
  fetchFundiJobs: () => void;
  handleAcceptInstantJob: (jobId: string) => void;
  handleProgressStatus: (jobId: string, status: 'en_route' | 'started' | 'completed') => void;
  bidAmount: number;
  setBidAmount: (val: number) => void;
  bidDuration: number;
  setBidDuration: (val: number) => void;
  bidNote: string;
  setBidNote: (val: string) => void;
  handleSubmitBid: (e: React.FormEvent) => void;
  chatMessages: ChatMessage[];
  newMessage: string;
  setNewMessage: (val: string) => void;
  handleSendChatMsg: () => void;
}

export default function FundiActiveJobs({
  user,
  selectedJob,
  fetchFundiJobs,
  handleAcceptInstantJob,
  handleProgressStatus,
  bidAmount,
  setBidAmount,
  bidDuration,
  setBidDuration,
  bidNote,
  setBidNote,
  handleSubmitBid,
  chatMessages,
  newMessage,
  setNewMessage,
  handleSendChatMsg
}: FundiActiveJobsProps) {
  if (!selectedJob) {
    return (
      <div className="lg:col-span-8">
        <div className="h-full min-h-[400px] flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-3xl p-8 dark:bg-slate-950/25">
          <Briefcase className="w-12 h-12 text-slate-700 animate-pulse mb-3" />
          <h3 className="font-display font-bold text-lg text-white">No job selected</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm text-center">Click any contract panel under your lists to manage milestones, update live tracking GPS, coordinate messages, or construct quotation proposals.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-8">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Selected Job Actions and communications */}
        <div className="md:col-span-7 bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-6 flex flex-col justify-between min-h-[450px]">
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-500">Service Order: {selectedJob.id}</span>
                <h3 className="font-display font-bold text-lg text-white mt-1">{selectedJob.title}</h3>
              </div>
              
              <span className="text-xs bg-slate-900 font-bold px-2 py-1 text-slate-400 border border-slate-800/80 rounded">
                {selectedJob.status.toUpperCase()}
              </span>
            </div>

            <p className="text-slate-400 mt-4 text-sm leading-relaxed">{selectedJob.description}</p>
          </div>

          {/* Submitting custom bids if quotation workflow and unclaimed */}
          {selectedJob.workflow === 'quotation' && !selectedJob.fundi_id && (
            <BidForm
              bidAmount={bidAmount}
              setBidAmount={setBidAmount}
              bidDuration={bidDuration}
              setBidDuration={setBidDuration}
              bidNote={bidNote}
              setBidNote={setBidNote}
              handleSubmitBid={handleSubmitBid}
            />
          )}

          {/* Accepting instant matching jobs alerts */}
          {selectedJob.workflow === 'instant' && selectedJob.status === 'matching' && (
            <div className="bg-slate-905 p-5 rounded-2xl border border-slate-800 text-left space-y-4">
              <span className="text-xs text-orange-400 font-bold block animate-pulse">⚡ ON-DEMAND INSTANT DISPATCH DISPATCH ALERT</span>
              <p className="text-xs text-gray-300">This client needs immediate water tank repairs/leak fixed nearby in Milimani Estate. Secure held escrow and match instantly.</p>
              <button
                onClick={() => handleAcceptInstantJob(selectedJob.id)}
                aria-label={`Accept instant match dispatch job for KES ${(selectedJob.amount || 0).toLocaleString()}`}
                className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
              >
                ACCEPT INSTANT MATCH DISPATCH KES {(selectedJob.amount || 0).toLocaleString()}
              </button>
            </div>
          )}

          {/* Assigned Active contract controls and progress state indicators */}
          {selectedJob.fundi_id === user.id && (
            <div className="space-y-4 border-t border-slate-900 pt-4">
              <span className="text-xs text-gray-400 font-semibold block">CONTRACT GPS LIFE CYCLE ACTIONS</span>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleProgressStatus(selectedJob.id, 'en_route')}
                  disabled={selectedJob.status !== 'accepted'}
                  aria-label="Mark en route to customer location"
                  className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-orange-500 font-medium text-xs disabled:opacity-30 flex flex-col items-center justify-center space-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                >
                  <Navigation className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <span>MARK EN ROUTE</span>
                </button>

                <button
                  onClick={() => handleProgressStatus(selectedJob.id, 'started')}
                  disabled={selectedJob.status !== 'en_route'}
                  aria-label="Start working on the task"
                  className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-orange-500 font-medium text-xs disabled:opacity-30 flex flex-col items-center justify-center space-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                >
                  <Play className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>START LABOUR</span>
                </button>

                <button
                  onClick={() => handleProgressStatus(selectedJob.id, 'completed')}
                  disabled={selectedJob.status !== 'started'}
                  aria-label="Mark job work as fully completed"
                  className="py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-orange-500 font-medium text-xs disabled:opacity-30 flex flex-col items-center justify-center space-y-1 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                >
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>FINALIZE WORK</span>
                </button>
              </div>

              {/* Digital Contract Agreement */}
              <div className="mt-4">
                <ContractSignCard
                  jobId={selectedJob.id}
                  user={user}
                  onSignedSuccess={fetchFundiJobs}
                />
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs text-slate-200 mt-4">
                <span>Held M-Pesa Escrow Wallet status:</span>
                <span className="font-bold font-mono text-orange-400">{selectedJob.escrow_status.toUpperCase()}</span>
              </div>

              {/* Dispute arbitration management panel */}
              <div className="mt-4">
                <DisputePanel
                  jobId={selectedJob.id}
                  user={user}
                  onStateChanged={fetchFundiJobs}
                />
              </div>
            </div>
          )}
        </div>

        {/* Direct text messages coordination */}
        <div className="md:col-span-5 flex flex-col h-[450px]">
          {selectedJob.fundi_id === user.id ? (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 text-left flex flex-col h-full">
              <span className="text-xs font-mono text-gray-500 uppercase block border-b border-slate-800 pb-2 mb-2 flex items-center space-x-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-orange-500" />
                <span>Coordinate Task Elements with Client</span>
              </span>

              <div className="flex-1 overflow-y-auto space-y-2 p-1 max-h-[300px]">
                {chatMessages.length === 0 ? (
                  <span className="text-[10px] text-slate-600 block text-center py-6">No communication text logged. Coordinate materials lists above.</span>
                ) : (
                  chatMessages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`p-2 rounded-xl max-w-[85%] text-xs ${
                        msg.sender_id === user.id ? 'bg-orange-500 text-slate-950 font-medium ml-auto' : 'bg-slate-900 border border-slate-800 text-slate-100 mr-auto'
                      }`}
                    >
                      <span className="text-[9px] opacity-75 block font-bold mb-0.5">{msg.sender_name}</span>
                      <p className="leading-snug">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center space-x-2 mt-auto">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type message text..."
                  aria-label="Type message text to contract chat partner"
                  className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
                <button
                  onClick={handleSendChatMsg}
                  aria-label="Send message text"
                  className="p-2 rounded-xl bg-orange-500 text-slate-950 hover:bg-orange-400 transition cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus:outline-none"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left flex items-center justify-center h-full text-slate-500 text-xs">
              <span>Chat panel links establish after contract assignment is accepted.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
