import React from 'react';
import { ShieldCheck, Loader2, Lock, ArrowRight, RefreshCw, X } from 'lucide-react';
import { Job, User } from '../../types';
import { usePaymentGateway } from '../../hooks/payment/usePaymentGateway';
import { PaymentChannelTabs } from './PaymentChannelTabs';
import { PaymentInputForms } from './PaymentInputForms';
import { PinPromptModal } from './PinPromptModal';
import { OtpPromptModal } from './OtpPromptModal';
import { PaymentSuccessView } from './PaymentSuccessView';

export interface PaymentGatewayProps {
  user: User;
  job: Job;
  onPaymentSuccess: () => void;
  onClose?: () => void;
}

export default function PaymentGateway({ user, job, onPaymentSuccess, onClose }: PaymentGatewayProps) {
  const {
    channel,
    setChannel,
    step,
    setStep,
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
    pin,
    setPin,
    otpCode,
    setOtpCode,
    checkoutId,
    statusMessage,
    txReceipt,
    handleCardNumberChange,
    handleCardExpiryChange,
    handleCardCvvChange,
    handleTriggerPayment,
    handleSimulatePinAuth,
    handleSimulateOtpAuth
  } = usePaymentGateway({ user, job, onPaymentSuccess });

  const isCompletedJobFlow = job.status === 'completed';
  const isHeldEscrow = job.escrow_status === 'held';

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
          <span className="text-base font-bold text-orange-500 font-mono">KES {(job?.amount || 0).toLocaleString()}</span>
        </div>
      </div>

      {/* Inner Screen Content Panels */}
      <div className="flex-1 py-5 flex flex-col justify-center min-h-[300px]">
        {step === 'input' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {isCompletedJobFlow && isHeldEscrow ? (
              /* Fast ESCROW Release scenario */
              <div className="space-y-4 text-center py-6 bg-slate-900/40 rounded-2xl border border-slate-900 p-4">
                <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <h5 className="text-sm font-bold text-white">Disburse Locked Funds</h5>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    You already secured <strong className="text-orange-400">KES {(job?.amount || 0).toLocaleString()}</strong> in Kazify Escrow. Since <strong>{job.fundi_name || 'the tradesperson'}</strong> has finalized your service, authorize instant delivery of these funds to their profile wallet.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => {
                      setStep('verifying');
                      handleTriggerPayment();
                    }}
                    className="w-full py-3 bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono rounded-xl transition flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <span>AUTHORIZE WALLET TRANSFER</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <p className="text-[9px] text-slate-500 font-mono mt-1.5">No supplementary fees or transaction charges are applied.</p>
                </div>
              </div>
            ) : (
              /* Standard New Payment scenario */
              <div className="space-y-4">
                <p className="text-xs text-slate-400 leading-normal">
                  {isCompletedJobFlow 
                    ? `Specify your billing provider below to pay KES ${(job?.amount || 0).toLocaleString()} immediately to ${job.fundi_name || 'tradesman'}. Saved under multi-sign security guidelines.`
                    : "Secure your contract instantly. Funds are held safely in a multi-party escrow wallet and are only released once the task is complete."
                  }
                </p>

                <PaymentChannelTabs channel={channel} setChannel={setChannel} />

                <PaymentInputForms
                  channel={channel}
                  job={job}
                  phoneNumber={phoneNumber}
                  setPhoneNumber={setPhoneNumber}
                  airtelNumber={airtelNumber}
                  setAirtelNumber={setAirtelNumber}
                  cardNumber={cardNumber}
                  cardExpiry={cardExpiry}
                  cardCvv={cardCvv}
                  cardHolder={cardHolder}
                  setCardHolder={setCardHolder}
                  phoneError={phoneError}
                  setPhoneError={setPhoneError}
                  cardError={cardError}
                  loading={loading}
                  handleCardNumberChange={handleCardNumberChange}
                  handleCardExpiryChange={handleCardExpiryChange}
                  handleCardCvvChange={handleCardCvvChange}
                  handleTriggerPayment={handleTriggerPayment}
                />
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
          <PinPromptModal
            channel={channel}
            job={job}
            pin={pin}
            setPin={setPin}
            checkoutId={checkoutId}
            isCompletedJobFlow={isCompletedJobFlow}
            handleSimulatePinAuth={handleSimulatePinAuth}
          />
        )}

        {step === 'otp_prompt' && (
          <OtpPromptModal
            job={job}
            otpCode={otpCode}
            setOtpCode={setOtpCode}
            handleSimulateOtpAuth={handleSimulateOtpAuth}
          />
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
          <PaymentSuccessView
            job={job}
            channel={channel}
            txReceipt={txReceipt}
            isCompletedJobFlow={isCompletedJobFlow}
            onClose={onClose}
          />
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
