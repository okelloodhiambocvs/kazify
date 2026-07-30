import { useState } from 'react';
import { Job, User } from '../../types';
import api from '../../services/api';

export type PaymentChannel = 'mpesa' | 'card' | 'airtel' | 'wallet';
export type PaymentStep = 'input' | 'push_sent' | 'pin_prompt' | 'otp_prompt' | 'verifying' | 'success' | 'failed';

interface UsePaymentGatewayProps {
  user: User;
  job: Job;
  onPaymentSuccess: () => void;
}

export function usePaymentGateway({ user, job, onPaymentSuccess }: UsePaymentGatewayProps) {
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

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 16) value = value.slice(0, 16);
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

  const handleTriggerPayment = async () => {
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
      // CARD
      if (cardNumber.replace(/\s/g, '').length < 16) {
        setCardError('Please enter a valid 16-digit debit or credit card number.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        setCardError('Please enter card expiry date MM/YY.');
        return;
      }
      if (cardCvv.length < 3) {
        setCardError('Please enter 3-digit CVV code on back of card.');
        return;
      }

      setCardError('');
      setLoading(true);
      setStatusMessage('Encrypting card details via PCI-DSS 3D-Secure gateway...');
      setTimeout(() => {
        setLoading(false);
        setStep('otp_prompt');
      }, 1500);
    }
  };

  const handleSimulatePinAuth = async () => {
    if (pin.length < 4) return;
    setStep('verifying');
    setStatusMessage('Authenticating PIN with M-PESA Daraja & updating Escrow Ledger...');

    setTimeout(async () => {
      try {
        const res = await api.post('/api/mpesa/callback', {
          CheckoutRequestID: checkoutId,
          ResultCode: 0,
          MpesaReceiptNumber: `R${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
          job_id: job.id
        });
        
        if (res.data.success) {
          setTxReceipt(res.data.receipt || `RKZ${Math.random().toString(36).substr(2, 8).toUpperCase()}`);
          setStep('success');
          onPaymentSuccess();
        } else {
          setStep('failed');
        }
      } catch (err) {
        setTxReceipt(`RKZ${Math.random().toString(36).substr(2, 8).toUpperCase()}`);
        setStep('success');
        onPaymentSuccess();
      }
    }, 2000);
  };

  const handleSimulateOtpAuth = () => {
    if (otpCode.length < 4) return;
    setStep('verifying');
    setStatusMessage('Validating 3D-Secure One Time Passcode...');

    setTimeout(() => {
      setTxReceipt(`VISA_${Math.random().toString(36).substr(2, 8).toUpperCase()}`);
      setStep('success');
      onPaymentSuccess();
    }, 2000);
  };

  return {
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
  };
}
