import React from 'react';
import { Smartphone, ChevronRight, Phone, AlertCircle, Wallet, CreditCard, Loader2 } from 'lucide-react';
import { PaymentChannel } from '../../hooks/payment/usePaymentGateway';
import { Job } from '../../types';

interface PaymentInputFormsProps {
  channel: PaymentChannel;
  job: Job;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  airtelNumber: string;
  setAirtelNumber: (val: string) => void;
  cardNumber: string;
  cardExpiry: string;
  cardCvv: string;
  cardHolder: string;
  setCardHolder: (val: string) => void;
  phoneError: string;
  setPhoneError: (val: string) => void;
  cardError: string;
  loading: boolean;
  handleCardNumberChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCardExpiryChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCardCvvChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTriggerPayment: () => void;
}

export const PaymentInputForms: React.FC<PaymentInputFormsProps> = ({
  channel,
  job,
  phoneNumber,
  setPhoneNumber,
  airtelNumber,
  setAirtelNumber,
  cardNumber,
  cardExpiry,
  cardCvv,
  cardHolder,
  setCardHolder,
  phoneError,
  setPhoneError,
  cardError,
  loading,
  handleCardNumberChange,
  handleCardExpiryChange,
  handleCardCvvChange,
  handleTriggerPayment
}) => {
  return (
    <>
      {channel === 'wallet' && (
        <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-850 animate-in fade-in duration-100 font-mono text-left">
          <div className="flex items-center space-x-1.5 text-orange-400">
            <Wallet className="w-4 h-4" />
            <span className="font-bold text-xs uppercase tracking-wider">PRE-FUNDED KAZIFY ACCOUNT</span>
          </div>
          <p className="text-slate-400 text-[10px] leading-relaxed">
            Settle this contract via your digital pre-funded wallet. Your personal balance must exceed the contract amount of <strong className="text-white">KES {(job?.amount || 0).toLocaleString()}</strong>.
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

          <div className="space-y-1.5 text-left">
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
        <div className="space-y-3 animate-in fade-in duration-100 text-left">
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
    </>
  );
};
