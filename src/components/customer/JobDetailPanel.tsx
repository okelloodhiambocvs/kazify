import React from 'react';
import { Wallet, ShieldCheck, Star, Sparkles, Compass, MessageSquare, Send } from 'lucide-react';
import { User, Job, Bid, ChatMessage } from '../../types';
import MpesaPayment from '../MpesaPayment';
import PaymentGateway from '../PaymentGateway';
import ContractSignCard from '../ContractSignCard';
import DisputePanel from '../DisputePanel';
import ReviewRating from '../ReviewRating';
import MapMock from '../MapMock';
import { getStatusIndex } from './CustomerJobsList';

interface JobDetailPanelProps {
  user: User;
  selectedJob: Job;
  showPaymentGateway: boolean;
  setShowPaymentGateway: (show: boolean) => void;
  paymentMethodTab: 'mpesa' | 'all';
  setPaymentMethodTab: (tab: 'mpesa' | 'all') => void;
  fetchCustomerJobs: () => void;
  fetchTransactions: () => void;
  handleAcceptBid: (bidId: string) => void;
  handleOpenProfileModal: (fundiId: string) => void;
  isSubmittingActiveJobReview: boolean;
  handleActiveJobReviewSubmit: (jobId: string, fundiId: string, rating?: number, comment?: string) => Promise<void>;
  chatMessages: ChatMessage[];
  newMessage: string;
  setNewMessage: (val: string) => void;
  handleSendChatMsg: () => void;
}

const statusOrder = ['matching', 'accepted', 'en_route', 'started', 'completed'];

export default function JobDetailPanel({
  user,
  selectedJob,
  showPaymentGateway,
  setShowPaymentGateway,
  paymentMethodTab,
  setPaymentMethodTab,
  fetchCustomerJobs,
  fetchTransactions,
  handleAcceptBid,
  handleOpenProfileModal,
  isSubmittingActiveJobReview,
  handleActiveJobReviewSubmit,
  chatMessages,
  newMessage,
  setNewMessage,
  handleSendChatMsg
}: JobDetailPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Left Side: Order properties and tracking actions */}
      {showPaymentGateway ? (
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-slate-900 p-1.5 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setPaymentMethodTab('mpesa')}
              className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1 ${
                paymentMethodTab === 'mpesa'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>M-PESA STK PUSH</span>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethodTab('all')}
              className={`flex-1 py-2 text-xs font-mono font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-1 ${
                paymentMethodTab === 'all'
                  ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ALL CHANNELS</span>
            </button>
          </div>

          {paymentMethodTab === 'mpesa' ? (
            <MpesaPayment
              user={user}
              job={selectedJob}
              onPaymentSuccess={() => {
                fetchCustomerJobs();
                fetchTransactions();
                setShowPaymentGateway(false);
              }}
              onClose={() => setShowPaymentGateway(false)}
            />
          ) : (
            <PaymentGateway
              user={user}
              job={selectedJob}
              onPaymentSuccess={() => {
                fetchCustomerJobs();
                fetchTransactions();
                setShowPaymentGateway(false);
              }}
              onClose={() => setShowPaymentGateway(false)}
            />
          )}
        </div>
      ) : (
        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left space-y-6">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-mono text-slate-500">ORDER ID: {selectedJob.id}</span>
              <span className="text-xs bg-slate-900 border border-slate-800 rounded px-2 text-slate-400">
                {selectedJob.workflow.toUpperCase()}
              </span>
            </div>
            <h3 className="font-display font-bold text-xl text-white mt-1">{selectedJob.title}</h3>
            <p className="text-slate-400 mt-1 text-sm leading-relaxed">{selectedJob.description}</p>
          </div>

          {/* Job Lifecycle Step Progress Timeline */}
          <div className="bg-slate-900/60 border border-slate-900/80 p-5 rounded-2xl space-y-5">
            <div className="flex justify-between items-center border-b border-slate-850 pb-2">
              <span className="text-[10px] text-slate-400 font-semibold tracking-wider font-mono">ORDER LIFE CYCLE</span>
              <span className="text-[10px] font-bold text-orange-400 font-mono bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                {selectedJob.status.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div className="relative pt-4 pb-2 px-1">
              {/* Connection Line background */}
              <div className="absolute top-[31px] left-0 w-full h-[3px] bg-slate-800 rounded-full"></div>
              
              {/* Active line fill */}
              <div 
                className="absolute top-[31px] left-0 h-[3px] bg-emerald-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${(getStatusIndex(selectedJob.status) / 4) * 100}%` }}
              ></div>

              {/* Stepper circles */}
              <div className="relative flex justify-between">
                {statusOrder.map((stepStatus, idx) => {
                  const isDone = getStatusIndex(selectedJob.status) >= idx;
                  const isCurrent = getStatusIndex(selectedJob.status) === idx;
                  
                  const stepLabel = 
                    stepStatus === 'matching' ? 'Post & Match' :
                    stepStatus === 'accepted' ? 'Vetted' :
                    stepStatus === 'en_route' ? 'En Route' :
                    stepStatus === 'started' ? 'Working' :
                    'Completed';

                  return (
                    <div key={stepStatus} className="flex flex-col items-center select-none">
                      <div 
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border transition-all duration-350 z-10 ${
                          isDone 
                            ? (isCurrent 
                                ? 'bg-orange-500 border-orange-400 text-slate-950 shadow-md shadow-orange-500/30 font-extrabold ring-4 ring-orange-500/20' 
                                : 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/10') 
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span className={`text-[9px] font-mono mt-2 font-bold transition-colors ${
                        isDone ? 'text-slate-200' : 'text-slate-500'
                      } ${isCurrent ? 'text-orange-400 scale-105' : ''}`}>
                        {stepLabel}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Digital Contract System Agreement */}
          {selectedJob.fundi_id && (
            <div className="mt-4">
              <ContractSignCard
                jobId={selectedJob.id}
                user={user}
                onSignedSuccess={fetchCustomerJobs}
              />
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
            <div>
              <span className="text-[10px] text-gray-500 uppercase font-mono block">Secured Escrow Wallet</span>
              <span className="text-lg font-bold text-slate-150">KES {(selectedJob.amount || 0).toLocaleString()}</span>
            </div>

            <div className="flex gap-2">
              {selectedJob.escrow_status === 'unpaid' ? (
                <button
                  onClick={() => setShowPaymentGateway(true)}
                  className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition flex items-center space-x-1 cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>STK PUSH PAY</span>
                </button>
              ) : (
                <div className="flex flex-col sm:flex-row gap-2">
                  <span className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4" />
                    <span>HELD SECURELY</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Dispute arbitration management panel */}
          {selectedJob.fundi_id && (
            <div className="mt-4">
              <DisputePanel
                jobId={selectedJob.id}
                user={user}
                onStateChanged={fetchCustomerJobs}
              />
            </div>
          )}

          {/* Assigned Fundi Details */}
          <div className="border-t border-slate-800 pt-4">
            <span className="text-xs font-mono text-gray-500 uppercase block mb-3">ASSIGNED TRADESPERSON</span>
            {selectedJob.fundi_id ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800/50 hover:border-orange-500/30 hover:bg-slate-900 group transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div 
                      onClick={() => handleOpenProfileModal(selectedJob.fundi_id!)}
                      className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-slate-950 font-bold font-display cursor-pointer"
                    >
                      {selectedJob.fundi_name?.substr(0, 2)}
                    </div>
                    <div>
                      <span 
                        onClick={() => handleOpenProfileModal(selectedJob.fundi_id!)}
                        className="text-sm font-semibold text-white block hover:text-orange-400 hover:underline cursor-pointer transition-colors"
                      >
                        {selectedJob.fundi_name}
                      </span>
                      <button
                        onClick={() => handleOpenProfileModal(selectedJob.fundi_id!)}
                        className="text-[10px] text-orange-500 font-mono flex items-center space-x-1 hover:text-orange-450 tracking-wide font-medium mt-0.5 cursor-pointer bg-transparent border-none"
                      >
                        <span>★ View Profile & Reviews</span>
                      </button>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs text-slate-400 font-mono">{selectedJob.fundi_phone}</span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 mt-1 rounded border border-emerald-500/20 uppercase tracking-widest font-bold">VERIFIED TRADESMAN</span>
                  </div>
                </div>

                {/* Escrow payout release actions if completed */}
                {selectedJob.status === 'completed' && selectedJob.escrow_status === 'held' && (
                  <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/30 text-left">
                    <span className="text-xs text-orange-400 font-bold block mb-1 font-display">TASK COMPLETED AND VETTED ✅</span>
                    <p className="text-xs text-slate-200">The tradesperson has marked the service as completed. Authorize and release the vault-locked escrow directly through our integrated gateway.</p>
                    <button
                      onClick={() => setShowPaymentGateway(true)}
                      className="mt-3 w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Wallet className="w-4 h-4" />
                      <span>SECURE ESCROW PAYOUT (KES {(selectedJob.amount || 0).toLocaleString()})</span>
                    </button>
                  </div>
                )}

                {/* Escrow payout released review box */}
                {selectedJob.status === 'completed' && selectedJob.escrow_status === 'released' && !selectedJob.is_rated && (
                  <div className="mt-3">
                    <ReviewRating 
                      isSubmitting={isSubmittingActiveJobReview}
                      submitButtonText="Submit Job Performance Review"
                      onSubmit={async (rating, comment) => {
                        await handleActiveJobReviewSubmit(selectedJob.id, selectedJob.fundi_id!, rating, comment);
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-500 text-xs py-2">
                {selectedJob.workflow === 'instant' ? (
                  <span className="animate-pulse">Searching nearest available plumbers... matching score active.</span>
                ) : (
                  <span>Waiting for available bids from local tradesmen.</span>
                )}
              </div>
            )}
          </div>

          {/* Top 3 Automated Recommendations Panel */}
          {!selectedJob.fundi_id && selectedJob.recommended_fundis && selectedJob.recommended_fundis.length > 0 && (
            <div className="border-t border-slate-800 pt-4 space-y-3 animate-in fade-in duration-200 text-left">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-orange-400 uppercase tracking-wider block font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-orange-400 shrink-0" />
                  Kazify Recommended Matches (Top 3 Match)
                </span>
                <span className="text-[9px] font-mono text-slate-500 uppercase">
                  Rating • Distance • Status
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {selectedJob.recommended_fundis.map((recFundi) => (
                  <div 
                    key={recFundi.id} 
                    className="p-3 rounded-xl bg-slate-900/50 hover:bg-slate-900 border border-slate-800/80 transition-all flex flex-col justify-between space-y-2 text-left group"
                  >
                    <div className="space-y-1">
                      <div className="flex justify-between items-start gap-1">
                        <span 
                          onClick={() => handleOpenProfileModal(recFundi.id)}
                          className="text-xs font-bold text-white hover:text-orange-400 hover:underline cursor-pointer truncate block flex-1"
                        >
                          {recFundi.name}
                        </span>
                        {recFundi.isReliable && (
                          <span className="text-[7px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-mono font-bold px-1 rounded uppercase shrink-0">
                            TOP⭐
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[9px] font-mono text-slate-400">
                        <span className="text-amber-400 font-bold flex items-center">
                          ★ {recFundi.rating.toFixed(1)}
                        </span>
                        <span>•</span>
                        <span className="text-blue-400 font-bold">
                          📍 {recFundi.distanceKM} KM
                        </span>
                      </div>

                      <span className="text-[9px] text-slate-500 font-mono block truncate">
                        {recFundi.address}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-950 gap-1">
                      <span className={`text-[8px] font-mono font-bold px-1 py-0.5 rounded uppercase border shrink-0 ${
                        recFundi.status === 'available'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/15'
                      }`}>
                        {recFundi.status}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleOpenProfileModal(recFundi.id)}
                        className="text-[9px] font-mono text-orange-500 hover:text-orange-400 hover:underline cursor-pointer font-bold bg-transparent border-none"
                      >
                        VIEW
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Job bidding panel if quotation workflow */}
          {selectedJob.workflow === 'quotation' && !selectedJob.fundi_id && (
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <span className="text-xs font-mono text-gray-500 uppercase block">Active Fundi Bids ({selectedJob.bids?.length || 0})</span>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {(selectedJob.bids || []).map((bid: Bid) => (
                  <div key={bid.id} className="p-3 rounded-xl bg-slate-900 border border-slate-800/60 flex items-center justify-between">
                    <div>
                      <span 
                        onClick={() => handleOpenProfileModal(bid.fundi_id)}
                        className="text-sm font-bold text-white block hover:text-orange-400 hover:underline cursor-pointer transition-colors"
                      >
                        {bid.fundi_name}
                      </span>
                      <div className="flex items-center space-x-2 text-[10px] text-gray-400 mt-0.5">
                        <span className="flex items-center text-amber-500 font-bold">
                          <Star className="w-3 h-3 mr-0.5 fill-amber-500" />
                          {bid.fundi_rating}
                        </span>
                        <span>•</span>
                        <span className="font-mono">{bid.duration_days} days schedule</span>
                        <span>•</span>
                        <button
                          onClick={() => handleOpenProfileModal(bid.fundi_id)}
                          className="text-orange-500 hover:text-orange-400 hover:underline font-mono cursor-pointer font-bold bg-transparent border-none text-[10px]"
                        >
                          View Reviews
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-300 italic mt-1 font-mono">"{bid.note}"</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-emerald-400 block mb-1.5">KES {(bid.amount || 0).toLocaleString()}</span>
                      <button
                        onClick={() => handleAcceptBid(bid.id)}
                        className="px-2.5 py-1 text-[10px] font-bold bg-orange-500 text-slate-950 rounded hover:bg-orange-400 transition cursor-pointer"
                      >
                        ACCEPT
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Right Side: Map & Direct Coordinate Tracking & Messaging */}
      <div className="space-y-4">
        {/* Visual Map component */}
        <div className="w-full h-80 rounded-3xl overflow-hidden shadow-2xl relative">
          <MapMock
            customerLocation={{ lat: -0.0917, lng: 34.7680, address: selectedJob.address }}
            fundiLocation={selectedJob.fundi_lat ? { lat: selectedJob.fundi_lat, lng: selectedJob.fundi_lng || 0, address: 'Moving Fundi' } : undefined}
            isTracking={selectedJob.status === 'en_route'}
          />
          {selectedJob.status === 'en_route' && (
            <div className="absolute bottom-4 left-4 bg-slate-950/90 border border-slate-800 text-left px-3 py-2 rounded-xl text-xs font-mono flex items-center space-x-2">
              <Compass className="w-4 h-4 text-orange-500 animate-spin" />
              <div>
                <span className="text-gray-400 block text-[9px] uppercase">TRACTION ETA</span>
                <span className="text-emerald-400 font-bold">{selectedJob.estimated_duration || '7 mins'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Direct text messages coordination */}
        {selectedJob.fundi_id && (
          <div className="bg-slate-950 border border-slate-800 rounded-3xl p-4 text-left flex flex-col h-64">
            <span className="text-xs font-mono text-gray-500 uppercase block border-b border-slate-800 pb-2 mb-2 flex items-center space-x-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Coordinating Chat Thread with Fundi</span>
            </span>

            <div className="flex-1 overflow-y-auto space-y-2 p-1 max-h-40">
              {chatMessages.length === 0 ? (
                <span className="text-[10px] text-slate-600 block text-center py-6">Send a message to coordinate coordinates/materials...</span>
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

            <div className="flex items-center space-x-2 mt-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type standard message details..."
                className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-orange-500"
              />
              <button
                onClick={handleSendChatMsg}
                className="p-2 rounded-xl bg-orange-500 text-slate-950 hover:bg-orange-400 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
