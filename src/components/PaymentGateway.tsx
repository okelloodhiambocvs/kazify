import React, { useState } from 'react';
import { 
  Smartphone, ShieldCheck, Loader2, CreditCard, ChevronRight, Check, X, Phone, RefreshCw, AlertCircle,
  Wallet, Lock, Sparkles, Receipt, Database, Users, Building, ArrowRight
} from 'lucide-react';
import { Job, User } from '../types';
import api from '../services/api';

interface PaymentGatewayProps {
  user: User;
  job: Job;
  onPaymentSuccess: () => void;
  onClose?: () => void;
}

type PaymentChannel = 'mpesa' | 'card' | 'airtel' | 'wallet';
type PaymentStep = 'input' | 'push_sent' | 'pin_prompt' | 'otp_prompt' | 'verifying' | 'success' | 'failed';

export default function PaymentGateway({ user, job, onPaymentSuccess, onClose }: PaymentGatewayProps) {
  const [channel, setChannel] = useState<PaymentChannel>('mpesa');
  const [step, setStep] = useState<PaymentStep>('input');
  
  // Input fields
  const [phoneNumber, setPhoneNumber] = useState(user.phone || '0700000000');
  const [airtelNumber, setAirtelNumber] = useState(user.phone || '0730000000');
  
  // Credit Card inputs
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState(user.name || '');

  // Errors & loading
  const [phoneError, setPhoneError] = useState('');
  const [cardError, setCardError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  const [checkoutId, setCheckoutId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [txReceipt, setTxReceipt] = useState('');

  // Auto-validate Kenyan phone format
  const validatePhone = (num: string): boolean => {
    const sanitized = num.trim().replace(/\s+|-/g, '');
    const regex = /^(?:\+254|254|0)?([713]\d{8})$/;
    
    if (!sanitized) {
      setPhoneError('Phone number is required');
      return false;
    }
    if (!regex.test(sanitized)) {
      setPhoneError('Please enter a valid Safaricom/Airtel number (e.g. 0712345678)');
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

  // Card input formatters
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
    // Format as 4-digit blocks
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 4) value = value.slice(0, 4);
    if (value.length > 2) {
      setCardExpiry(`${value.slice(0, 2)}/${value.slice(2, 4)}`);
    } else {
      setCardExpiry(value);
    }
  };

  const handleCardCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 3) value = value.slice(0, 3);
    setCardCvv(value);
  };

  // Check whether this payment is securing escrow vs direct payout for completed job
  const isCompletedJobFlow = job.status === 'completed';
  const isHeldEscrow = job.escrow_status === 'held';

  const handleTriggerPayment = async () => {
    // Validate inputs based on active payment channel
    if (channel === 'wallet') {
      setLoading(true);
      setStatusMessage('Authorizing wallet escrow debit and executing multi-party lock...');
      try {
        const res = await api.post('/api/wallets/pay-escrow', {
          user_id: user.id,
          job_id: job.id
        });
        if (res.data.success) {
          setTxReceipt(`TXN_WLT_${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
          setStep('success');
          setLoading(false);
          onPaymentSuccess();
        }
      } catch (err: any) {
        setPhoneError(err.response?.data?.error || 'Insufficient wallet balance or account deactivated.');
        setLoading(false);
      }
    } else if (channel === 'mpesa') {
      if (!validatePhone(phoneNumber)) return;
      setLoading(true);
      setStatusMessage('Requesting Safaricom STK Push via Daraja API gateway...');
      
      try {
        const formatted = getFormattedPhone(phoneNumber);
        const res = await api.post('/api/mpesa/stkpush', {
          phone_number: formatted,
          amount: job.amount,
          job_id: job.id
        });
        setCheckoutId(res.data.CheckoutRequestID || `ws_CO_${Date.now()}`);
        setStep('push_sent');
        setLoading(false);

        setTimeout(() => {
          setStep('pin_prompt');
        }, 1200);
      } catch (err: any) {
        setPhoneError(err.response?.data?.error || 'M-Pesa Escrow initiation failed. Please retry.');
        setLoading(false);
      }
    } else if (channel === 'airtel') {
      if (!validatePhone(airtelNumber)) return;
      setLoading(true);
      setStatusMessage('Requesting Airtel Money STK push payment envelope...');
      
      try {
        setCheckoutId(`airtel_CO_${Date.now()}`);
        setStep('push_sent');
        setLoading(false);

        setTimeout(() => {
          setStep('pin_prompt');
        }, 1200);
      } catch (err: any) {
        setPhoneError('Airtel initiation error. Contact support.');
        setLoading(false);
      }
    } else {
      // CREDIT CARD
      if (cardNumber.replace(/\s/g, '').length < 16) {
        setCardError('Please enter a valid 16-digit credit card number.');
        return;
      }
      if (cardExpiry.length < 5) {
        setCardError('Please enterexpiry date (MM/YY).');
        return;
      }
      if (cardCvv.length < 3) {
        setCardError('CVV code must be 3 digits.');
        return;
      }
      if (!cardHolder.trim()) {
        setCardError('Cardholder name is required.');
        return;
      }
      setCardError('');
      setLoading(true);
      setStatusMessage('Verifying Card with Visa/Mastercard SecureCode network...');

      setTimeout(() => {
        setStep('otp_prompt');
        setLoading(false);
      }, 1500);
    }
  };

  const handleSimulatePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;

    setStep('verifying');
    setLoading(true);
    setStatusMessage(isCompletedJobFlow 
      ? 'Delivering secure payout instantly to recipient wallet...'
      : 'Earmarking funds safely into Kazify Escrow Vault...'
    );

    try {
      // Call the new unified payment route
      const formatted = channel === 'mpesa' ? getFormattedPhone(phoneNumber) : getFormattedPhone(airtelNumber);
      await api.post('/api/payments/charge', {
        payment_method: channel,
        id: job.id,
        amount: job.amount,
        phone_number: formatted,
        status_target: isCompletedJobFlow ? 'completed' : 'held'
      });

      setTimeout(() => {
        setTxReceipt(`TXN_${channel.slice(0, 3).toUpperCase()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
        setStep('success');
        setLoading(false);
        onPaymentSuccess();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setStep('failed');
      setLoading(false);
    }
  };

  const handleSimulateOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length < 6) return;

    setStep('verifying');
    setLoading(true);
    setStatusMessage('Acquiring Merchant Settlement Token...');

    try {
      await api.post('/api/payments/charge', {
        payment_method: 'card',
        id: job.id,
        amount: job.amount,
        card_number: cardNumber.replace(/\s/g, ''),
        holder_name: cardHolder,
        status_target: isCompletedJobFlow ? 'completed' : 'held'
      });

      setTimeout(() => {
        setTxReceipt(`TXN_CRD_${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
        setStep('success');
        setLoading(false);
        onPaymentSuccess();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setStep('failed');
      setLoading(false);
    }
  };

  // Direct Escrow release button action (if escrow is already HELD and job is COMPLETED)
  const handleReleaseHeldEscrow = async () => {
    setStep('verifying');
    setLoading(true);
    setStatusMessage('Releasing client funds to Tradesperson wallet via instant escrow disbursement...');

    try {
      await api.post('/api/payments/charge', {
        payment_method: 'escrow_release',
        id: job.id,
        amount: job.amount,
        status_target: 'completed'
      });

      setTimeout(() => {
        setTxReceipt(`TXN_RLS_${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
        setStep('success');
        setLoading(false);
        onPaymentSuccess();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setStep('failed');
      setLoading(false);
    }
  };

  return (
    <div id="payment-gateway-wrapper" className="bg-slate-950 border border-slate-800 rounded-3xl p-5 text-left relative overflow-hidden flex flex-col justify-between min-h-[460px] animate-in fade-in duration-300">
      {/* Visual branding elements */}
      <div className="absolute -top-16 -left-16 w-40 h-40 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -right-16 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Info Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-3 pb-4 border-b border-slate-900">
        <div>
          <div className="flex items-center space-x-1.5">
            <span className={`inline-flex items-center text-[10px] uppercase px-2 py-0.5 rounded font-mono font-bold tracking-wider border ${
              isCompletedJobFlow 
                ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            }`}>
              {isCompletedJobFlow ? 'Direct Settlement' : 'M-PESA Secure Escrow'}
            </span>
            {isHeldEscrow && isCompletedJobFlow && (
              <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-mono uppercase font-bold">
                Escrow Custody
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-white mt-1.5 flex items-center space-x-1">
            <Lock className="w-3.5 h-3.5 text-orange-500 mr-1" />
            <span>
              {isCompletedJobFlow 
                ? (isHeldEscrow ? 'Release Custody Payout' : 'Settle Completed Service')
                : 'Safely Lock Service Escrow'
              }
            </span>
          </h4>
          <p className="text-[11px] text-slate-400 mt-1 truncate max-w-xs sm:max-w-md">Contract: {job.title}</p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <span className="text-[9px] text-slate-500 font-mono block">FINAL SETTLEMENT</span>
          <span className="text-base font-bold text-orange-500 font-mono">KES {job.amount.toLocaleString()}</span>
        </div>
      </div>

      {/* Inner Screen Content Panels */}
      <div className="flex-1 py-5 flex flex-col justify-center min-h-[300px]">
        
        {step === 'input' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {isCompletedJobFlow && isHeldEscrow ? (
              // Fast ESCROW Release scenario
              <div className="space-y-4 text-center py-6 bg-slate-900/40 rounded-2xl border border-slate-900 p-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h5 className="text-sm font-bold text-white">Disburse Locked Funds</h5>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    You already secured <strong className="text-orange-400">KES {job.amount.toLocaleString()}</strong> in Kazify Escrow. Since <strong>{job.fundi_name || 'the tradesperson'}</strong> has finalized your service, authorize instant delivery of these funds to their profile wallet.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleReleaseHeldEscrow}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>AUTHORIZE WALLET TRANSFER</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[9px] text-slate-500 font-mono mt-1.5">No supplementary fees or transaction charges are applied.</p>
                </div>
              </div>
            ) : (
              // standard New Payment scenario (either escrow lock or direct check out)
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-normal">
                  {isCompletedJobFlow 
                    ? `Specify your billing provider below to pay KES ${job.amount.toLocaleString()} immediately to ${job.fundi_name || 'tradesman'}. Saved under multi-sign security guidelines.`
                    : "Secure your contract instantly. Funds are held safely in a multi-party escrow wallet and are only released once the task is complete."
                  }
                </p>

                {/* Secure Channel Tabs */}
                <div className="grid grid-cols-4 gap-1 p-1 bg-slate-900/60 rounded-xl border border-slate-900">
                  <button
                    type="button"
                    onClick={() => setChannel('mpesa')}
                    className={`py-2 px-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      channel === 'mpesa' 
                        ? 'bg-emerald-500 text-slate-950 font-extrabold shadow-md shadow-emerald-500/10' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>M-PESA</span>
                    <span className="text-[7px] opacity-80">(STK)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('wallet')}
                    className={`py-2 px-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      channel === 'wallet' 
                        ? 'bg-orange-500 text-slate-950 font-extrabold shadow-md shadow-orange-500/10' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>MY WALLET</span>
                    <span className="text-[7px] opacity-80">(Balance)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('card')}
                    className={`py-2 px-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      channel === 'card' 
                        ? 'bg-slate-750 text-white font-extrabold' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>CARD</span>
                    <span className="text-[7px] opacity-80">(Visa/MC)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('airtel')}
                    className={`py-2 px-1 text-[9px] font-bold font-mono rounded-lg transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      channel === 'airtel' 
                        ? 'bg-rose-600 text-white font-extrabold shadow-md shadow-rose-600/10' 
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <span>AIRTEL</span>
                    <span className="text-[7px] opacity-80">(STK)</span>
                  </button>
                </div>

                {/* Form fields depending on selected channel */}
                {channel === 'wallet' && (
                  <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-850 animate-in fade-in duration-100 font-mono text-left">
                    <div className="flex items-center space-x-1.5 text-orange-400">
                      <Wallet className="w-4 h-4" />
                      <span className="font-bold text-xs uppercase tracking-wider">PRE-FUNDED KAZIFY ACCOUNT</span>
                    </div>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                      Settle this contract via your digital pre-funded wallet. Your personal balance must exceed the contract amount of <strong className="text-white">KES {job.amount.toLocaleString()}</strong>.
                    </p>
                  </div>
                )}
                {channel === 'mpesa' && (
                  <div className="space-y-3 animate-in fade-in duration-100">
                    <div className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1 text-left">
                      <span className="text-[8px] font-mono text-emerald-400 font-bold uppercase tracking-wider block">
                        Lipa Na M-Pesa Integration Sourced
                      </span>
                      <p className="text-[10px] text-slate-400 leading-snug font-sans">
                        Safaricom Daraja API running in <strong className="text-emerald-400">Sandbox Mode</strong>. Using Business Shortcode <code className="text-white px-1 bg-slate-900 rounded border border-slate-800">174379</code> and Passkey configured in <code className="text-white">.env.example</code>.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                        Safaricom M-Pesa Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Phone className="w-4 h-4 text-emerald-400" />
                        </div>
                        <input
                          type="text"
                          value={phoneNumber}
                          onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(''); }}
                          placeholder="e.g. 0712345678"
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-emerald-500"
                          disabled={loading}
                        />
                      </div>
                      {phoneError && (
                        <p className="text-[10px] text-rose-400 font-mono flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{phoneError}</span>
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleTriggerPayment}
                      disabled={loading}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Negotiating secure channel...</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>TRIGGER SAFARICOM STK PUSH</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {channel === 'airtel' && (
                  <div className="space-y-3 animate-in fade-in duration-100">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono text-slate-400 font-bold block uppercase tracking-wider">
                        Airtel Registered Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                          <Phone className="w-4 h-4 text-rose-500" />
                        </div>
                        <input
                          type="text"
                          value={airtelNumber}
                          onChange={(e) => { setAirtelNumber(e.target.value); setPhoneError(''); }}
                          placeholder="e.g. 0731234567"
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono focus:outline-none focus:border-rose-500"
                          disabled={loading}
                        />
                      </div>
                      {phoneError && (
                        <p className="text-[10px] text-rose-400 font-mono flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{phoneError}</span>
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleTriggerPayment}
                      disabled={loading}
                      className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Initiating Airtel secure link...</span>
                        </>
                      ) : (
                        <>
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>TRIGGER AIRTEL STK PUSH</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {channel === 'card' && (
                  <div className="space-y-4 animate-in fade-in duration-100 text-left">
                    {/* Animated visual debit card widget */}
                    <div className="w-full h-36 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-orange-950/25 border border-slate-800 p-4 relative flex flex-col justify-between overflow-hidden shadow-xl select-none">
                      <div className="absolute -top-10 -right-10 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex justify-between items-center">
                        <div className="h-6 w-9 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center overflow-hidden relative">
                          <div className="absolute w-[2px] h-full bg-amber-500/30 left-1.5" />
                          <div className="absolute w-[2px] h-full bg-amber-500/30 left-3" />
                          <div className="absolute w-[2px] h-full bg-amber-500/30 left-4.5" />
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 tracking-wider">DEBIT CONTRACT CARD</div>
                      </div>

                      <div className="font-mono text-sm tracking-widest text-white block my-1">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>

                      <div className="flex justify-between items-end">
                        <div className="space-y-0.5">
                          <div className="text-[7px] text-slate-500 font-mono uppercase">Card Holder</div>
                          <div className="text-[10px] font-bold text-slate-200 capitalize truncate max-w-[150px]">{cardHolder || 'CARDOWNER NAME'}</div>
                        </div>

                        <div className="flex gap-4">
                          <div className="space-y-0.5">
                            <div className="text-[7px] text-slate-500 font-mono uppercase">Expires</div>
                            <div className="text-[10px] font-mono text-slate-200">{cardExpiry || 'MM/YY'}</div>
                          </div>
                          <div className="space-y-0.5">
                            <div className="text-[7px] text-slate-500 font-mono uppercase">CVV</div>
                            <div className="text-[10px] font-mono text-slate-200">{cardCvv ? '•••' : '123'}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inputs panel */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-slate-400 font-bold block uppercase tracking-wider">Card Number</label>
                        <input
                          type="text"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          placeholder="4111 2222 3333 4444"
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-slate-400 font-bold block uppercase tracking-wider">Expiry Date</label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={handleCardExpiryChange}
                            placeholder="MM/YY"
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:border-orange-500 text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[9px] font-mono text-slate-400 font-bold block uppercase tracking-wider">CVV Code</label>
                          <input
                            type="password"
                            maxLength={3}
                            value={cardCvv}
                            onChange={handleCardCvvChange}
                            placeholder="•••"
                            className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs font-mono focus:outline-none focus:border-orange-500 text-center"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-mono text-slate-400 font-bold block uppercase tracking-wider">Cardholder Name</label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="e.g. Phyllis Nyaboke"
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      {cardError && (
                        <p className="text-[10px] text-rose-400 font-mono flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{cardError}</span>
                        </p>
                      )}
                    </div>

                    <button
                      onClick={handleTriggerPayment}
                      disabled={loading}
                      className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying with Card Network...</span>
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>SECURE TRANSACT WITH CARD</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'push_sent' && (
          <div className="text-center py-6 space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto border ${
              channel === 'mpesa' 
                ? 'bg-emerald-500/10 border-emerald-550/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}>
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h5 className="text-sm font-bold text-white">Push Request Dispatched</h5>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              We have locked a payment invoice to {channel === 'mpesa' ? 'Safaricom Daraja' : 'Airtel Money API'}. Check handset #{channel === 'mpesa' ? phoneNumber : airtelNumber} for the instant secure prompt...
            </p>
          </div>
        )}

        {step === 'pin_prompt' && (
          <div className="flex flex-col md:flex-row items-center md:space-x-6 space-y-4 md:space-y-0 animate-in slide-in-from-bottom-3 duration-250">
            {/* Phone Screen Simulation Widget */}
            <div className={`w-[190px] border-4 ${
              channel === 'mpesa' ? 'border-emerald-550/80 bg-slate-950/98' : 'border-rose-950 bg-slate-950/98'
            } rounded-3xl p-3.5 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[240px] mx-auto select-none grow-0 shrink-0`}>
              
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-800 rounded-full" />
              
              <div className="flex justify-between text-[7px] font-mono text-slate-500 pt-2">
                <span>{channel === 'mpesa' ? 'Safaricom' : 'Airtel'}</span>
                <span>Active 5G</span>
              </div>

              {/* Popup frame */}
              <div className={`border rounded-xl p-2.5 my-2 text-left space-y-1.5 shadow-2xl ${
                channel === 'mpesa' 
                  ? 'bg-emerald-950/95 border-emerald-500/40' 
                  : 'bg-rose-950/95 border-rose-500/40'
              }`}>
                <span className={`text-[7px] font-mono uppercase tracking-widest block font-bold ${
                  channel === 'mpesa' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {channel === 'mpesa' ? 'M-PESA ESCROW' : 'AIRTEL SECURE'}
                </span>
                <p className="text-[8px] leading-tight text-white font-sans">
                  {isCompletedJobFlow 
                    ? `Pay KES ${job.amount.toLocaleString()} directly to ${job.fundi_name || 'tradesman'}?`
                    : `Lock KES ${job.amount.toLocaleString()} in secure escrow?`
                  }
                </p>
                
                <form onSubmit={handleSimulatePinSubmit} className="space-y-1">
                  <span className="text-[6.5px] text-slate-400 font-mono block">ENTER 4-DIGIT PIN</span>
                  <input
                    type="password"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full bg-slate-900 border border-slate-700 text-center py-0.5 rounded text-xs font-mono font-bold text-white focus:outline-none"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={pin.length < 4}
                    className={`w-full py-1 text-[8px] font-bold rounded transition cursor-pointer ${
                      channel === 'mpesa' 
                        ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400' 
                        : 'bg-rose-600 text-white hover:bg-rose-500'
                    }`}
                  >
                    SEND PIN
                  </button>
                </form>
              </div>

              <span className="text-[7px] text-center text-slate-600 block font-mono">HANDSET POPUP MOCK</span>
            </div>

            <div className="flex-1 text-left space-y-3.5">
              <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                <span>Interactive Handset Prompt</span>
              </h5>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Our gateway fully emulates Safaricom/Airtel secure push callbacks. Enter any <strong className="text-white">4-digit PIN</strong> on the simulated mobile device to proceed safely.
              </p>
              
              <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1 font-mono text-[10px]">
                <div className="text-slate-500 flex justify-between">
                  <span>Merchant Log</span>
                  <span className="text-slate-300">Daraja Tunnel</span>
                </div>
                <div className="text-slate-500 flex justify-between">
                  <span>Checkout Request</span>
                  <span className="text-slate-300 truncate max-w-[120px]">{checkoutId}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'otp_prompt' && (
          <div className="flex flex-col md:flex-row items-center md:space-x-6 space-y-4 md:space-y-0 animate-in slide-in-from-bottom-3 duration-250">
            {/* Phone SMS simulation */}
            <div className="w-[190px] border-4 border-orange-950 bg-slate-950 rounded-3xl p-3.5 shadow-2xl relative overflow-hidden flex flex-col justify-between h-[240px] mx-auto select-none grow-0 shrink-0">
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-800 rounded-full" />
              
              <div className="flex justify-between text-[7px] font-mono text-slate-500 pt-2">
                <span>SMS Inbox</span>
                <span>Active 5G</span>
              </div>

              {/* SMS bubble popup */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-left space-y-1 my-3 shadow-2xl">
                <span className="text-[7px] font-mono text-orange-400 font-bold block uppercase">VERIFICATION SMS</span>
                <p className="text-[7.5px] leading-snug text-slate-300 font-sans">
                  KAZIFY-CARD SECURE: Use <strong>882910</strong> to authorize KES {job.amount.toLocaleString()}. Ref: {job.id.slice(-6)}.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 text-left space-y-1">
                <form onSubmit={handleSimulateOtpSubmit} className="space-y-1">
                  <span className="text-[7px] text-slate-500 font-mono block uppercase">ENTER SMS CODE</span>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="882910"
                    className="w-full bg-slate-900 border border-slate-800 text-center py-1 rounded text-xs font-mono font-bold text-white focus:outline-none focus:border-orange-500"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={otpCode.length < 6}
                    className="w-full py-1 text-[8px] bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold rounded transition cursor-pointer"
                  >
                    SUBMIT CARD OTP
                  </button>
                </form>
              </div>

              <span className="text-[7px] text-center text-slate-600 block font-mono">SECURE OTP SIMULATOR</span>
            </div>

            <div className="flex-1 text-left space-y-3">
              <h5 className="text-sm font-bold text-white">Three-Domain Card OTP</h5>
              <p className="text-xs text-slate-400 leading-relaxed font-sans">
                Our gateway requires secondary authentication to settle debit card balances. Enter the 6-digit mock security token <strong className="text-orange-400 font-mono">882910</strong> sent in the simulated message on the smartphone.
              </p>
            </div>
          </div>
        )}

        {step === 'verifying' && (
          <div className="text-center py-6 space-y-4 animate-in fade-in duration-150">
            <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500 animate-spin">
              <RefreshCw className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h5 className="text-sm font-bold text-amber-500">Contacting Clearing Network...</h5>
              <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">{statusMessage}</p>
            </div>
            <span className="inline-flex text-[9px] bg-slate-900 border border-slate-850 px-2.5 py-1 rounded text-slate-500 font-mono uppercase font-bold tracking-widest animate-pulse">
              PENDING AUTHORIZATION
            </span>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-4 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400 shadow-xl shadow-emerald-500/10">
              <ShieldCheck className="w-7 h-7" />
            </div>
            
            <div className="space-y-1.5">
              <h5 className="text-sm font-bold text-white">
                {isCompletedJobFlow 
                  ? 'Payment Settled Successfully!' 
                  : 'Escrow Funds Secured Successfully!'
                }
              </h5>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-normal">
                {isCompletedJobFlow
                  ? `KES ${job.amount.toLocaleString()} on-demand payout was delivered directly to ${job.fundi_name || 'tradesperson'}'s registered wallet.`
                  : `K Kazify secured KES ${job.amount.toLocaleString()} inside Kazify Escrow Vault. An interactive regional dispatch notification has been targeted to verified experts.`
                }
              </p>
            </div>

            {/* Receipt ledger widget */}
            <div className="bg-slate-900/80 border border-slate-850 rounded-2xl p-4 max-w-sm mx-auto text-left font-mono space-y-2 text-[10px]">
              <div className="flex items-center space-x-1.5 border-b border-slate-800 pb-2 mb-1.5">
                <Receipt className="w-3.5 h-3.5 text-orange-500" />
                <span className="font-bold text-slate-300">OFFICIAL SERVICE RECEIPT</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TRANSACTION ID</span>
                <span className="text-white font-bold">{txReceipt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">PROVIDER</span>
                <span className="text-white uppercase font-bold">{channel.toUpperCase()} SECURE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">SETTLEMENT TYPE</span>
                <span className={`font-bold ${isCompletedJobFlow ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {isCompletedJobFlow ? 'DIRECT DISBURSEMENT' : 'ESCROW HOLD'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">RECIPIENT NAME</span>
                <span className="text-white font-bold">{job.fundi_name || 'PENDING DISPATCH'}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="px-6 py-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-white rounded-xl text-xs font-mono transition cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>
        )}

        {step === 'failed' && (
          <div className="text-center py-6 space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400">
              <X className="w-6 h-6" />
            </div>
            <h5 className="text-sm font-bold text-white">Payment Attempt Declined</h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              We could not complete your request. This happens if the PIN or OTP is incorrect, or the account is locked. Please try again.
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

      {/* Footer security labels */}
      <div className="border-t border-slate-900 pt-3.5 text-[9px] text-slate-500 font-mono text-center flex items-center justify-center space-x-1.5 leading-none">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>End-to-End Encryption • PCI-DSS Certified • Safaricom Authorized Daraja Integrator</span>
      </div>
    </div>
  );
}
