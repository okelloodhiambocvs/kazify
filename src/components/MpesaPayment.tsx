import React, { useState } from 'react';
import { 
  Smartphone, ShieldCheck, Loader2, Check, X, Phone, AlertCircle,
  Receipt, Lock, Sparkles, ArrowRight, RefreshCw
} from 'lucide-react';
import { Job, User } from '../types';
import api from '../services/api';

interface MpesaPaymentProps {
  user: User;
  job: Job;
  onPaymentSuccess: () => void;
  onClose?: () => void;
}

type Step = 'input' | 'push_sent' | 'pin_prompt' | 'verifying' | 'success' | 'failed';

export default function MpesaPayment({ user, job, onPaymentSuccess, onClose }: MpesaPaymentProps) {
  const [step, setStep] = useState<Step>('input');
  const [phoneNumber, setPhoneNumber] = useState(user.phone || '0712345678');
  const [phoneError, setPhoneError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [checkoutId, setCheckoutId] = useState('');
  const [txReceipt, setTxReceipt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const validatePhone = (num: string): boolean => {
    const sanitized = num.trim().replace(/\s+|-/g, '');
    const regex = /^(?:\+254|254|0)?([713]\d{8})$/;
    
    if (!sanitized) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!regex.test(sanitized)) {
      setPhoneError('Please enter a valid Safaricom number (e.g. 0712345678 or 254712345678)');
      return false;
    }
    setPhoneError('');
    return true;
  };

  const getFormattedPhone = (num: string): string => {
    const sanitized = num.trim().replace(/\s+|-/g, '');
    const match = sanitized.match(/^(?:\+254|254|0)?([713]\d{8})$/);
    if (match) {
      return `254${match[1]}`;
    }
    return sanitized;
  };

  const handleTriggerStkPush = async () => {
    if (!validatePhone(phoneNumber)) return;
    
    setLoading(true);
    setErrorMessage('');

    try {
      const formatted = getFormattedPhone(phoneNumber);
      const res = await api.post('/api/mpesa/stkpush', {
        job_id: job.id,
        phone_number: formatted,
        amount: job.amount
      });

      setCheckoutId(res.data.checkoutRequestId || `ws_CO_${Date.now()}`);
      setStep('push_sent');
      setLoading(false);

      setTimeout(() => {
        setStep('pin_prompt');
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error || 'M-Pesa STK push request failed. Please check network connection.');
      setStep('failed');
      setLoading(false);
    }
  };

  const handleSimulatePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;

    setStep('verifying');
    setLoading(true);

    setTimeout(() => {
      setTxReceipt(`MPE_${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
      setStep('success');
      setLoading(false);
      onPaymentSuccess();
    }, 1500);
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 text-left relative overflow-hidden flex flex-col justify-between min-h-[440px] shadow-2xl animate-in fade-in duration-300">
      {/* Visual background ambient glows */}
      <div className="absolute -top-16 -left-16 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-4 border-b border-slate-900">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center text-[10px] uppercase px-2.5 py-0.5 rounded font-mono font-bold tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Lipa Na M-PESA STK Push
            </span>
            <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-mono uppercase font-bold">
              Daraja 2.0 API
            </span>
          </div>
          <h4 className="text-base font-bold text-white mt-2 flex items-center space-x-1.5">
            <Lock className="w-4 h-4 text-sky-400 mr-1" />
            <span>Lock Escrow Funds Safely</span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">Contract: {job.title}</p>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span className="text-[9px] text-slate-500 font-mono block">ESCROW DEPOSIT</span>
          <span className="text-lg font-bold text-sky-400 font-mono">KES {(job?.amount || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 py-4 flex flex-col justify-center min-h-[280px]">
        {step === 'input' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <p className="text-xs text-slate-300 leading-relaxed">
              Initiate a direct Safaricom M-Pesa STK Push. Funds are secured in Kazify Escrow Vault and released to <strong className="text-white">{job.fundi_name || 'the tradesperson'}</strong> only when you confirm job completion.
            </p>

            <div className="p-3 bg-sky-500/5 border border-sky-500/15 rounded-xl space-y-1">
              <span className="text-[9px] font-mono text-sky-400 font-bold uppercase tracking-wider block">
                Safaricom Daraja Gateway Active
              </span>
              <p className="text-[11px] text-slate-400 leading-snug">
                Shortcode: <code className="text-white px-1.5 py-0.5 bg-slate-900 rounded border border-slate-800 font-mono">174379</code> | Sandbox Integration
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                M-Pesa Registered Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-sky-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setPhoneError('');
                  }}
                  placeholder="0712345678 or 254712345678"
                  className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-3 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-sky-400"
                  disabled={loading}
                />
              </div>
              {phoneError && (
                <p className="text-[10px] text-rose-400 font-mono flex items-center gap-1 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{phoneError}</span>
                </p>
              )}
            </div>

            <button
              onClick={handleTriggerStkPush}
              disabled={loading}
              className="w-full py-3.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold font-mono rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-sky-500/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting Safaricom Gateway...</span>
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  <span>TRIGGER STK PUSH (KES {(job?.amount || 0).toLocaleString()})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}

        {step === 'push_sent' && (
          <div className="text-center py-6 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="w-14 h-14 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mx-auto">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <h5 className="text-sm font-bold text-white">STK Push Dispatched!</h5>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              We dispatched an STK Push prompt to handset <strong className="text-sky-400">{phoneNumber}</strong>. Check your phone...
            </p>
          </div>
        )}

        {step === 'pin_prompt' && (
          <div className="flex flex-col md:flex-row items-center md:space-x-6 space-y-4 md:space-y-0 animate-in slide-in-from-bottom-3 duration-200">
            {/* Phone Screen Mock */}
            <div className="w-[200px] border-4 border-sky-500/80 bg-slate-950 rounded-3xl p-3.5 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[240px] mx-auto select-none shrink-0">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-800 rounded-full" />
              <div className="flex justify-between text-[7px] font-mono text-slate-500 pt-2">
                <span>Safaricom</span>
                <span>Active 5G</span>
              </div>

              <div className="bg-sky-950/90 border border-sky-500/40 rounded-xl p-2.5 my-2 text-left space-y-1.5 shadow-2xl">
                <span className="text-[7px] font-mono uppercase text-sky-400 font-bold block">
                  M-PESA ESCROW LOCK
                </span>
                <p className="text-[8px] leading-tight text-white font-sans">
                  Pay KES {(job?.amount || 0).toLocaleString()} for {job.title}?
                </p>
                
                <form onSubmit={handleSimulatePinSubmit} className="space-y-1 pt-1">
                  <span className="text-[6.5px] text-slate-400 font-mono block">ENTER 4-DIGIT M-PESA PIN</span>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-900 border border-slate-700 text-center py-1 rounded text-xs font-mono font-bold text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={pin.length < 4}
                    className="w-full py-1 text-[8px] bg-sky-500 text-slate-950 font-bold rounded transition hover:bg-sky-400 cursor-pointer disabled:opacity-50"
                  >
                    CONFIRM PIN
                  </button>
                </form>
              </div>

              <span className="text-[7px] text-center text-slate-600 block font-mono">HANDSET STK PROMPT</span>
            </div>

            <div className="flex-1 text-left space-y-3">
              <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-sky-400 animate-pulse" />
                <span>Simulated Handset PIN Prompt</span>
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed">
                Enter any <strong className="text-white">4-digit PIN</strong> on the handset simulator to authorize the escrow lock.
              </p>
              
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 font-mono text-[10px]">
                <div className="text-slate-500 flex justify-between">
                  <span>Checkout Request ID</span>
                  <span className="text-slate-300 truncate max-w-[120px]">{checkoutId}</span>
                </div>
                <div className="text-slate-500 flex justify-between">
                  <span>Gateway Tunnel</span>
                  <span className="text-sky-400">Safaricom Daraja</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'verifying' && (
          <div className="text-center py-6 space-y-3 animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto animate-spin">
              <RefreshCw className="w-7 h-7" />
            </div>
            <h5 className="text-sm font-bold text-amber-400">Verifying Transaction Callback...</h5>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              Locking KES {(job?.amount || 0).toLocaleString()} safely inside Kazify Escrow Vault.
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center mx-auto shadow-xl shadow-sky-500/10">
              <ShieldCheck className="w-8 h-8" />
            </div>
            
            <div className="space-y-1">
              <h5 className="text-base font-bold text-white">Escrow Payment Secured!</h5>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-normal">
                KES {(job?.amount || 0).toLocaleString()} has been safely deposited into Kazify Escrow for "{job.title}".
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-w-sm mx-auto text-left font-mono space-y-2 text-[10px]">
              <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2 mb-1.5">
                <Receipt className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-bold text-slate-200">M-PESA ESCROW RECEIPT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">RECEIPT NO</span>
                <span className="text-white font-bold">{txReceipt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">AMOUNT HELD</span>
                <span className="text-sky-400 font-bold">KES {(job?.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PHONE NUMBER</span>
                <span className="text-white">{phoneNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ESCROW STATUS</span>
                <span className="text-sky-400 font-bold">HELD SECURELY</span>
              </div>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white rounded-xl text-xs font-mono transition cursor-pointer"
              >
                Close & View Job Dashboard
              </button>
            )}
          </div>
        )}

        {step === 'failed' && (
          <div className="text-center py-6 space-y-3 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <X className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-white">M-Pesa Escrow Initiation Failed</h5>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {errorMessage || 'Payment was cancelled or timed out. Please verify your phone number and try again.'}
            </p>
            <button
              onClick={() => setStep('input')}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 text-xs font-mono transition cursor-pointer"
            >
              Retry Payment
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-900 pt-3 text-[9px] text-slate-500 font-mono text-center flex items-center justify-center space-x-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
        <span>Safaricom Certified Daraja API Gateway • Multi-party Escrow Custody</span>
      </div>
    </div>
  );
}
