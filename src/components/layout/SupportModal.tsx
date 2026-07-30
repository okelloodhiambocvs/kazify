import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle, Check, RefreshCw, Send } from 'lucide-react';
import { User } from '../../types';

interface SupportModalProps {
  user: User;
  isDark: boolean;
  showSupportModal: boolean;
  setShowSupportModal: (show: boolean) => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({
  user,
  isDark,
  showSupportModal,
  setShowSupportModal
}) => {
  const [supportType, setSupportType] = useState('order');
  const [supportOrderId, setSupportOrderId] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [supportSuccessMessage, setSupportSuccessMessage] = useState('');
  const [supportTicketId, setSupportTicketId] = useState('');

  return (
    <AnimatePresence>
      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={`w-full max-w-md p-6 rounded-2xl shadow-2xl relative border ${
              isDark 
                ? 'bg-slate-900 border-slate-800 text-slate-100' 
                : 'bg-white border-slate-200 text-slate-800'
            }`}
            id="support-ticket-modal"
          >
            <button
              onClick={() => {
                setShowSupportModal(false);
                setSupportSuccessMessage('');
                setSupportMessage('');
                setSupportOrderId('');
              }}
              className={`absolute top-4 right-4 p-1.5 rounded-xl border transition cursor-pointer font-mono ${
                isDark 
                  ? 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white' 
                  : 'bg-slate-100 border-slate-200 text-slate-605 hover:text-slate-900'
              }`}
              id="support-modal-close"
            >
              <X className="w-4 h-4" />
            </button>

            {supportSuccessMessage ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 scale-110">
                  <Check className="w-6 h-6 animate-pulse" />
                </div>
                <h3 className={`text-base font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>Help Request Logged!</h3>
                <div className={`p-3 rounded-xl mb-4 text-xs font-mono text-left space-y-1.5 border ${
                  isDark ? 'bg-slate-950 border-slate-850' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Ticket ID:</span>
                    <span className="text-orange-400 font-bold">#{supportTicketId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Category:</span>
                    <span className={isDark ? 'text-slate-300 capitalize' : 'text-slate-700 capitalize'}>{supportType} Issue</span>
                  </div>
                  {supportOrderId && (
                    <div className="flex justify-between">
                      <span className={isDark ? 'text-slate-500' : 'text-slate-400'}>Reference:</span>
                      <span className={`truncate max-w-[180px] ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{supportOrderId}</span>
                    </div>
                  )}
                </div>
                <p className={`text-xs leading-relaxed max-w-xs mx-auto mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  M-Pesa Escrow Desk operators and National Dispatch auditors have received your inquiry. We will contact you or issue an SMS update on: <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{user.phone || '0700000001'}</span> shortly.
                </p>
                <button
                  onClick={() => {
                    setShowSupportModal(false);
                    setSupportSuccessMessage('');
                    setSupportMessage('');
                    setSupportOrderId('');
                  }}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition cursor-pointer"
                  id="support-success-dismiss"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="text-left">
                <div className="flex items-center space-x-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Contact Kazify Support</h3>
                    <span className={`text-[10px] font-mono tracking-wider uppercase ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Active Dispatch & Escrow Desk</span>
                  </div>
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (supportMessage.trim().length < 10) return;
                    setIsSubmittingSupport(true);
                    setTimeout(() => {
                      const randomId = 'KZ-' + Math.floor(10000 + Math.random() * 90000);
                      setSupportTicketId(randomId);
                      setIsSubmittingSupport(false);
                      setSupportSuccessMessage('Logged');
                    }, 1000);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SUPPORT CATEGORY</label>
                    <select
                      value={supportType}
                      onChange={(e) => setSupportType(e.target.value)}
                      className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono focus:ring-1 focus:ring-orange-500/20 border ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white' 
                          : 'bg-slate-50 border-slate-205 text-slate-900'
                      }`}
                      id="support-ticket-category"
                    >
                      <option value="order">📦 Order / Tradesman Dispatch</option>
                      <option value="payment">💳 M-Pesa Escrow Settlement</option>
                      <option value="account">🔒 Account & Phone Preferences</option>
                      <option value="technical">🛠️ System or App Bug</option>
                      <option value="other">💬 General Inquiries & Suggestions</option>
                    </select>
                  </div>

                  {(supportType === 'order' || supportType === 'payment') && (
                    <div>
                      <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>ORDER OR JOB ID (OPTIONAL)</label>
                      <input
                        type="text"
                        placeholder="e.g. JB-8391 or Transaction Code"
                        value={supportOrderId}
                        onChange={(e) => setSupportOrderId(e.target.value)}
                        className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono focus:ring-1 focus:ring-orange-500/20 border ${
                          isDark 
                            ? 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-600' 
                            : 'bg-slate-50 border-slate-205 text-slate-900 placeholder:text-slate-400'
                        }`}
                        id="support-ticket-order-id"
                      />
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className={`text-[10px] font-mono font-semibold uppercase tracking-wider block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>DETAILED DESCRIPTION</label>
                      <span className={`text-[9px] font-mono ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{supportMessage.length}/500 chars</span>
                    </div>
                    <textarea
                      rows={4}
                      placeholder="Please describe your issue, order conflict, or payout issue in detail..."
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value.slice(0, 500))}
                      className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono focus:ring-1 focus:ring-orange-500/20 resize-none border ${
                        isDark 
                          ? 'bg-slate-950 border-slate-800 text-white placeholder:text-slate-600' 
                          : 'bg-slate-50 border-slate-250 text-slate-900 placeholder:text-slate-400'
                      }`}
                      id="support-ticket-description"
                      required
                    />
                    {supportMessage.trim().length > 0 && supportMessage.trim().length < 10 && (
                      <span className="text-[10px] text-orange-400 font-mono mt-1 block">Message must be at least 10 characters</span>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowSupportModal(false);
                        setSupportMessage('');
                        setSupportOrderId('');
                      }}
                      disabled={isSubmittingSupport}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer font-mono disabled:opacity-50 ${
                        isDark 
                          ? 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300' 
                          : 'bg-slate-100 hover:bg-slate-200/80 border-slate-200 text-slate-600'
                      }`}
                      id="support-cancel-btn"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingSupport || supportMessage.trim().length < 10}
                      className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold font-mono transition cursor-pointer flex items-center space-x-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      id="support-submit-btn"
                    >
                      {isSubmittingSupport ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Routing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Create Ticket</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
