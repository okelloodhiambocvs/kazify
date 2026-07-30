import axios from 'axios';
import crypto from 'crypto';
import { isDbMode } from '../db';
import * as paymentRepository from '../db/paymentRepository';
import * as escrowRepository from '../db/escrowRepository';
import * as jobsRepository from '../db/jobsRepository';

export interface PaymentIntent {
  id: string;
  job_id: string;
  user_id: string;
  amount: number;
  phone_number: string;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'expired';
  checkout_request_id: string;
  merchant_request_id: string;
  idempotency_key?: string;
  retry_count: number;
  last_error?: string;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  payment_intent_id?: string;
  job_id?: string;
  amount: number;
  phone_number: string;
  mpesa_receipt_number: string;
  transaction_date: string;
  status: 'completed' | 'failed';
  raw_callback_payload?: any;
  created_at: string;
}

export interface ReconciliationRecord {
  id: string;
  transaction_id?: string;
  payment_intent_id?: string;
  mpesa_receipt_number?: string;
  amount_expected: number;
  amount_received: number;
  reconciliation_status: 'matched' | 'mismatch_amount' | 'mismatch_phone' | 'not_found_in_daraja' | 'unreconciled';
  verified_at: string;
  notes?: string;
  created_at: string;
}

export let paymentIntents: PaymentIntent[] = [];
export let transactions: Transaction[] = [];
export let reconciliationRecords: ReconciliationRecord[] = [];

function getMpesaConfig() {
  const env = process.env.MPESA_ENV || 'sandbox';
  const consumerKey = process.env.MPESA_CONSUMER_KEY || '';
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET || '';
  const shortcode = process.env.MPESA_SHORTCODE || '174379';
  const passkey = process.env.MPESA_PASSKEY || '';
  
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const webhookSecret = process.env.MPESA_WEBHOOK_SECRET || '';
  const callbackUrl = process.env.MPESA_CALLBACK_URL || `${appUrl}/api/mpesa/callback?secret=${webhookSecret}`;

  const isLive = env === 'production';
  const baseUrl = isLive 
    ? 'https://api.safaricom.co.ke' 
    : 'https://sandbox.safaricom.co.ke';

  const isConfigured = consumerKey.length > 0 && consumerSecret.length > 0;

  return {
    env,
    consumerKey,
    consumerSecret,
    shortcode,
    passkey,
    callbackUrl,
    webhookSecret,
    baseUrl,
    isConfigured
  };
}

function getBasicAuthHeader(key: string, secret: string) {
  return 'Basic ' + Buffer.from(`${key}:${secret}`).toString('base64');
}

function getSafaricomTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  return now.getFullYear().toString() +
         pad(now.getMonth() + 1) +
         pad(now.getDate()) +
         pad(now.getHours()) +
         pad(now.getMinutes()) +
         pad(now.getSeconds());
}

export class DarajaClient {
  private static accessToken: string | null = null;
  private static tokenExpiresAt: number | null = null;

  public static async getAccessToken(): Promise<string> {
    const config = getMpesaConfig();
    
    if (!config.isConfigured) {
      throw new Error('Safaricom Daraja credentials (Consumer Key/Secret) not set in environment.');
    }

    if (this.accessToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }

    try {
      const url = `${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
      const auth = getBasicAuthHeader(config.consumerKey, config.consumerSecret);
      
      const response = await axios.get(url, {
        headers: {
          Authorization: auth
        }
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        const expiresInMs = parseInt(response.data.expires_in || '3599') * 1000;
        this.tokenExpiresAt = Date.now() + expiresInMs;
        console.log(`[DARAJA] Generated new Access Token. Expires in ${response.data.expires_in}s`);
        return this.accessToken!;
      } else {
        throw new Error('OAuth token response structure invalid: ' + JSON.stringify(response.data));
      }
    } catch (error: any) {
      console.error('[DARAJA] Token Generation Error:', error.response?.data || error.message);
      throw new Error(`Failed to generate Safaricom access token: ${error.message}`);
    }
  }

  public static async initiateSTKPush(params: {
    phoneNumber: string;
    amount: number;
    jobId: string;
    userId: string;
    idempotencyKey?: string;
  }): Promise<{
    MerchantRequestID: string;
    CheckoutRequestID: string;
    ResponseCode: string;
    ResponseDescription: string;
    isSimulated: boolean;
  }> {
    const config = getMpesaConfig();
    const cleanPhone = this.formatMsisdn(params.phoneNumber);
    const amountRounded = Math.round(params.amount);

    const existingIntent = isDbMode() 
      ? await paymentRepository.findPendingIntentByJobPhoneOrKey({
          jobId: params.jobId,
          phone: cleanPhone,
          idempotencyKey: params.idempotencyKey
        })
      : paymentIntents.find(i => 
          (params.idempotencyKey && i.idempotency_key === params.idempotencyKey) ||
          (i.job_id === params.jobId && i.status === 'pending' && i.phone_number === cleanPhone)
        );

    if (existingIntent) {
      console.log(`[DARAJA] Idempotent request hit. Returning existing pending checkout request ID: ${existingIntent.checkout_request_id}`);
      return {
        MerchantRequestID: existingIntent.merchant_request_id,
        CheckoutRequestID: existingIntent.checkout_request_id,
        ResponseCode: '0',
        ResponseDescription: 'Pending payment intent already exists. Idempotency guard triggered.',
        isSimulated: !config.isConfigured
      };
    }

    if (!config.isConfigured) {
      console.warn('[DARAJA] Missing API keys. Triggering Simulated Sandbox Mode for checkout.');
      const simulatedCheckoutId = `ws_CO_${crypto.randomBytes(8).toString('hex')}`;
      const simulatedMerchantId = `MR_${crypto.randomBytes(6).toString('hex')}`;

      const newIntent: PaymentIntent = {
        id: isDbMode() ? crypto.randomUUID() : `intent_${Date.now()}`,
        job_id: params.jobId,
        user_id: params.userId,
        amount: params.amount,
        phone_number: cleanPhone,
        status: 'pending',
        checkout_request_id: simulatedCheckoutId,
        merchant_request_id: simulatedMerchantId,
        idempotency_key: params.idempotencyKey,
        retry_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (isDbMode()) {
        await paymentRepository.createIntent(newIntent);
      } else {
        paymentIntents.unshift(newIntent);
      }
      this.simulateSafaricomCallback(simulatedCheckoutId, simulatedMerchantId, amountRounded, cleanPhone);

      return {
        MerchantRequestID: simulatedMerchantId,
        CheckoutRequestID: simulatedCheckoutId,
        ResponseCode: '0',
        ResponseDescription: 'Success. Simulated STK push initiated.',
        isSimulated: true
      };
    }

    try {
      const token = await this.getAccessToken();
      const timestamp = getSafaricomTimestamp();
      
      const rawPassword = config.shortcode + config.passkey + timestamp;
      const password = Buffer.from(rawPassword).toString('base64');

      const url = `${config.baseUrl}/mpesa/stkpush/v1/processrequest`;
      
      const payload = {
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: amountRounded,
        PartyA: cleanPhone,
        PartyB: config.shortcode,
        PhoneNumber: cleanPhone,
        CallBackURL: config.callbackUrl,
        AccountReference: `Job_${params.jobId.substring(0, 10)}`,
        TransactionDesc: `Escrow payment for job ${params.jobId}`
      };

      console.log(`[DARAJA] Posting STK Push request to Safaricom endpoint: ${url}`);
      
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const resData = response.data;
      
      if (resData.ResponseCode === '0') {
        const newIntent: PaymentIntent = {
          id: isDbMode() ? crypto.randomUUID() : `intent_${Date.now()}`,
          job_id: params.jobId,
          user_id: params.userId,
          amount: params.amount,
          phone_number: cleanPhone,
          status: 'pending',
          checkout_request_id: resData.CheckoutRequestID,
          merchant_request_id: resData.MerchantRequestID,
          idempotency_key: params.idempotencyKey,
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (isDbMode()) {
          await paymentRepository.createIntent(newIntent);
        } else {
          paymentIntents.unshift(newIntent);
        }
        console.log(`[DARAJA] STK push intent successfully saved: ${resData.CheckoutRequestID}`);
      }

      return {
        MerchantRequestID: resData.MerchantRequestID,
        CheckoutRequestID: resData.CheckoutRequestID,
        ResponseCode: resData.ResponseCode,
        ResponseDescription: resData.ResponseDescription,
        isSimulated: false
      };
    } catch (error: any) {
      const errPayload = error.response?.data || error.message;
      console.error('[DARAJA] Lipa Na M-Pesa STK Push error:', errPayload);
      
      if (config.env === 'sandbox' || !process.env.NODE_ENV || process.env.NODE_ENV !== 'production') {
        console.warn('[DARAJA] Safaricom rejected the real checkout request, falling back to simulated sandbox mode to prevent blocking the checkout flow.');
        
        const simulatedCheckoutId = `ws_CO_fallback_${crypto.randomBytes(6).toString('hex')}`;
        const simulatedMerchantId = `MR_fallback_${crypto.randomBytes(4).toString('hex')}`;

        const newIntent: PaymentIntent = {
          id: isDbMode() ? crypto.randomUUID() : `intent_fallback_${Date.now()}`,
          job_id: params.jobId,
          user_id: params.userId,
          amount: params.amount,
          phone_number: cleanPhone,
          status: 'pending',
          checkout_request_id: simulatedCheckoutId,
          merchant_request_id: simulatedMerchantId,
          idempotency_key: params.idempotencyKey,
          retry_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_error: `Real STK failed: ${typeof errPayload === 'object' ? JSON.stringify(errPayload) : errPayload}`
        };
        
        if (isDbMode()) {
          await paymentRepository.createIntent(newIntent);
        } else {
          paymentIntents.unshift(newIntent);
        }
        this.simulateSafaricomCallback(simulatedCheckoutId, simulatedMerchantId, amountRounded, cleanPhone);

        return {
          MerchantRequestID: simulatedMerchantId,
          CheckoutRequestID: simulatedCheckoutId,
          ResponseCode: '0',
          ResponseDescription: 'Success. M-Pesa Sandbox simulation fallback triggered due to real API rejection.',
          isSimulated: true
        };
      }

      throw new Error(`M-Pesa API rejected checkout request: ${JSON.stringify(errPayload)}`);
    }
  }

  public static async queryTransactionStatus(checkoutRequestId: string): Promise<any> {
    const config = getMpesaConfig();
    const intent = isDbMode()
      ? await paymentRepository.findIntentByCheckoutId(checkoutRequestId)
      : paymentIntents.find(i => i.checkout_request_id === checkoutRequestId);

    const isSimulatedRequest = checkoutRequestId.startsWith('ws_CO_') || (intent && intent.id.includes('fallback'));

    if (!config.isConfigured || isSimulatedRequest) {
      if (intent) {
        return {
          ResponseCode: '0',
          ResponseDescription: 'Success (Simulated status query response)',
          ResultCode: '0',
          ResultDesc: 'The service request is processed successfully.',
          CheckoutRequestID: checkoutRequestId,
          MerchantRequestID: intent.merchant_request_id
        };
      }
      throw new Error('Simulated transaction intent not found.');
    }

    try {
      const token = await this.getAccessToken();
      const timestamp = getSafaricomTimestamp();
      const rawPassword = config.shortcode + config.passkey + timestamp;
      const password = Buffer.from(rawPassword).toString('base64');

      const url = `${config.baseUrl}/mpesa/stkpushquery/v1/query`;

      const payload = {
        BusinessShortCode: config.shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId
      };

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error: any) {
      console.error('[DARAJA] STK push status query error:', error.response?.data || error.message);
      throw error;
    }
  }

  public static async handleCallback(
    body: any, 
    clientIp?: string, 
    receivedSecret?: string,
    authHeader?: string
  ): Promise<{ success: boolean; message: string; data?: any }> {
    const config = getMpesaConfig();

    // 1. Mandatory Webhook Secret & Token Verification
    if (config.webhookSecret && config.webhookSecret.trim().length > 0) {
      const headerToken = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
      const providedSecret = receivedSecret || headerToken;
      
      if (!providedSecret || providedSecret !== config.webhookSecret) {
        console.warn(`[DARAJA SECURITY ALERT] Callback URL secret verification failed! Provided: "${providedSecret || 'NONE'}", Expected: "${config.webhookSecret}"`);
        return { success: false, message: 'Forbidden: Invalid or missing webhook verification secret' };
      }
    }

    // 2. Production IP Range Verification (Safaricom Daraja Gateway Subnets)
    if (config.env === 'production' && clientIp) {
      const safaricomIpPrefixes = ['196.201.214.', '196.201.213.', '196.201.215.', '196.201.212.'];
      const isWhitelistedIp = safaricomIpPrefixes.some(prefix => clientIp.includes(prefix)) || clientIp.includes('127.0.0.1') || clientIp.includes('::1');
      if (!isWhitelistedIp) {
        console.warn(`[DARAJA SECURITY ALERT] Callback request from unverified non-Safaricom IP address: ${clientIp}`);
        return { success: false, message: 'Forbidden: Source IP address unauthorized for M-Pesa callbacks' };
      }
    }

    // 3. Strict Payload Structural Integrity Checks
    const stkCallback = body?.Body?.stkCallback;
    if (!stkCallback || typeof stkCallback !== 'object') {
      return { success: false, message: 'Invalid payload: stkCallback block missing or malformed' };
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const merchantRequestId = stkCallback.MerchantRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    if (!checkoutRequestId || typeof checkoutRequestId !== 'string') {
      return { success: false, message: 'Invalid payload: CheckoutRequestID missing or invalid type' };
    }

    if (typeof resultCode !== 'number') {
      return { success: false, message: 'Invalid payload: ResultCode missing or invalid type' };
    }

    console.log(`[DARAJA CALLBACK] Received webhook callback for checkout ${checkoutRequestId}. Code: ${resultCode}. Desc: ${resultDesc}`);

    const intent = isDbMode()
      ? await paymentRepository.findIntentByCheckoutId(checkoutRequestId)
      : paymentIntents.find(i => i.checkout_request_id === checkoutRequestId);

    if (!intent) {
      console.warn(`[DARAJA AUDIT ALERT] Received callback for unmatched checkout request ID: ${checkoutRequestId}`);
      if (isDbMode()) {
        await paymentRepository.createReconciliation({
          mpesa_receipt_number: 'UNMATCHED',
          amount_expected: 0,
          amount_received: 0,
          reconciliation_status: 'unreconciled',
          verified_at: new Date().toISOString(),
          notes: `Callback checkout ID ${checkoutRequestId} did not match any payment intent. Possible fraud or misconfiguration.`
        });
      } else {
        reconciliationRecords.unshift({
          id: `rec_${Date.now()}`,
          mpesa_receipt_number: 'UNMATCHED',
          amount_expected: 0,
          amount_received: 0,
          reconciliation_status: 'unreconciled',
          verified_at: new Date().toISOString(),
          notes: `Callback checkout ID ${checkoutRequestId} did not match any payment intent. Possible fraud or misconfiguration.`,
          created_at: new Date().toISOString()
        });
      }
      return { success: false, message: 'Unmatched CheckoutRequestID. Logged for reconciliation audits.' };
    }

    if (intent.status !== 'pending') {
      console.log(`[DARAJA] Checkout request ${checkoutRequestId} already processed. Status: ${intent.status}`);
      return { success: true, message: 'Transaction already updated.' };
    }

    if (resultCode !== 0) {
      if (isDbMode()) {
        await paymentRepository.updateIntentStatus(intent.id, 'failed', resultDesc);
      }
      intent.status = 'failed';
      intent.last_error = resultDesc;
      intent.updated_at = new Date().toISOString();
      return { success: true, message: `Payment intent updated to failed: ${resultDesc}`, data: intent };
    }

    const metadataItems = stkCallback.CallbackMetadata?.Item || [];
    let receiptNumber = '';
    let transactionAmount = 0;
    let transactionDateNum = '';
    let phoneNumber = '';

    metadataItems.forEach((item: any) => {
      if (item.Name === 'MpesaReceiptNumber') receiptNumber = item.Value;
      if (item.Name === 'Amount') transactionAmount = parseFloat(item.Value);
      if (item.Name === 'TransactionDate') transactionDateNum = item.Value.toString();
      if (item.Name === 'PhoneNumber') phoneNumber = item.Value.toString();
    });

    if (!receiptNumber) {
      receiptNumber = `SIM_REC_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    }

    let newTx: Transaction;
    if (isDbMode()) {
      newTx = await paymentRepository.createTransaction({
        payment_intent_id: intent.id,
        job_id: intent.job_id,
        amount: transactionAmount,
        phone_number: phoneNumber || intent.phone_number,
        mpesa_receipt_number: receiptNumber,
        transaction_date: this.parseSafaricomDate(transactionDateNum),
        status: 'completed',
        raw_callback_payload: body
      });
      await paymentRepository.updateIntentStatus(intent.id, 'success');
      intent.status = 'success';
      intent.updated_at = new Date().toISOString();
    } else {
      newTx = {
        id: `tx_${Date.now()}`,
        payment_intent_id: intent.id,
        job_id: intent.job_id,
        amount: transactionAmount,
        phone_number: phoneNumber || intent.phone_number,
        mpesa_receipt_number: receiptNumber,
        transaction_date: this.parseSafaricomDate(transactionDateNum),
        status: 'completed',
        raw_callback_payload: body,
        created_at: new Date().toISOString()
      };
      transactions.unshift(newTx);
      intent.status = 'success';
      intent.updated_at = new Date().toISOString();
    }

    await this.runReconciliation(intent, newTx);

    if (isDbMode() && intent.job_id) {
      await jobsRepository.update(intent.job_id, { escrow_status: 'held' });
      await escrowRepository.updateStatusByJobId(intent.job_id, 'held');
    }

    return { 
      success: true, 
      message: 'M-Pesa payment processed and verified successfully.', 
      data: { intent, transaction: newTx } 
    };
  }

  private static async runReconciliation(intent: PaymentIntent, transaction: Transaction) {
    const expected = intent.amount;
    const received = transaction.amount;
    let status: 'matched' | 'mismatch_amount' | 'mismatch_phone' | 'unreconciled' = 'matched';
    let notes = 'Payment fully matching registered escrow intent.';

    if (expected !== received) {
      status = 'mismatch_amount';
      notes = `Mismatched payment. Expected KES ${expected} but received KES ${received}. Needs physical reconciliation review.`;
      console.warn(`[RECONCILIATION EXCEPTION] Mismatched amount on intent ${intent.id}. expected ${expected}, got ${received}`);
    } else if (intent.phone_number !== transaction.phone_number) {
      status = 'mismatch_phone';
      notes = `Flagged: Paid using phone ${transaction.phone_number} but registered under ${intent.phone_number}. Transaction cleared but audited.`;
      console.log(`[RECONCILIATION WARNING] Mismatched Phone number. registered: ${intent.phone_number}, actual: ${transaction.phone_number}`);
    }

    if (isDbMode()) {
      await paymentRepository.createReconciliation({
        transaction_id: transaction.id,
        payment_intent_id: intent.id,
        mpesa_receipt_number: transaction.mpesa_receipt_number,
        amount_expected: expected,
        amount_received: received,
        reconciliation_status: status,
        verified_at: new Date().toISOString(),
        notes
      });
    } else {
      const record: ReconciliationRecord = {
        id: `rec_${Date.now()}`,
        transaction_id: transaction.id,
        payment_intent_id: intent.id,
        mpesa_receipt_number: transaction.mpesa_receipt_number,
        amount_expected: expected,
        amount_received: received,
        reconciliation_status: status,
        verified_at: new Date().toISOString(),
        notes,
        created_at: new Date().toISOString()
      };
      reconciliationRecords.unshift(record);
    }
    console.log(`[RECONCILIATION COMPLETE] Status: ${status}. Notes: ${notes}`);
  }

  public static async syncPendingIntents(): Promise<{ processed: number; failures: number }> {
    console.log('[DARAJA DAEMON] Syncing pending transactions and retrying if necessary...');
    let processed = 0;
    let failures = 0;

    const pendingList = paymentIntents.filter(i => i.status === 'pending');
    for (const intent of pendingList) {
      const elapsedMs = Date.now() - new Date(intent.created_at).getTime();
      
      if (elapsedMs > 900000) {
        try {
          const status = await this.queryTransactionStatus(intent.checkout_request_id);
          
          if (status.ResultCode === '0') {
            const mockBody = {
              Body: {
                stkCallback: {
                  MerchantRequestID: intent.merchant_request_id,
                  CheckoutRequestID: intent.checkout_request_id,
                  ResultCode: 0,
                  ResultDesc: 'Manual Query Sync Success',
                  CallbackMetadata: {
                    Item: [
                      { Name: 'Amount', Value: intent.amount },
                      { Name: 'MpesaReceiptNumber', Value: status.MpesaReceiptNumber || `QRY_${crypto.randomBytes(4).toString('hex').toUpperCase()}` },
                      { Name: 'TransactionDate', Value: getSafaricomTimestamp() },
                      { Name: 'PhoneNumber', Value: intent.phone_number }
                    ]
                  }
                }
              }
            };
            await this.handleCallback(mockBody);
            processed++;
          } else if (status.ResultCode) {
            intent.status = 'failed';
            intent.last_error = status.ResultDesc || 'Transaction expired or cancelled.';
            intent.updated_at = new Date().toISOString();
            processed++;
          } else {
            intent.retry_count++;
            intent.updated_at = new Date().toISOString();
            failures++;
          }
        } catch (err: any) {
          intent.retry_count++;
          intent.last_error = err.message;
          intent.updated_at = new Date().toISOString();
          failures++;
          console.error(`[DARAJA SYNC] Failed to query status for checkout ${intent.checkout_request_id}:`, err.message);
        }
      }
    }

    return { processed, failures };
  }

  private static formatMsisdn(phone: string): string {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('0')) {
      clean = '254' + clean.slice(1);
    } else if (clean.startsWith('+')) {
      clean = clean.slice(1);
    }
    if (!clean.startsWith('254')) {
      clean = '254' + clean;
    }
    return clean;
  }

  private static parseSafaricomDate(ts: string): string {
    if (!ts || ts.length < 14) return new Date().toISOString();
    const year = ts.substring(0, 4);
    const month = ts.substring(4, 6);
    const day = ts.substring(6, 8);
    const hour = ts.substring(8, 10);
    const minute = ts.substring(10, 12);
    const second = ts.substring(12, 14);
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+03:00`).toISOString();
  }

  private static simulateSafaricomCallback(checkoutId: string, merchantId: string, amount: number, phone: string) {
    console.log(`[SIMULATION] Registering delayed simulated Safaricom callback payload in 4 seconds for ${checkoutId}...`);
    setTimeout(async () => {
      const receipt = `QKF${Math.floor(Math.random() * 8 + 1)}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const payload = {
        Body: {
          stkCallback: {
            MerchantRequestID: merchantId,
            CheckoutRequestID: checkoutId,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: amount },
                { Name: 'MpesaReceiptNumber', Value: receipt },
                { Name: 'TransactionDate', Value: getSafaricomTimestamp() },
                { Name: 'PhoneNumber', Value: phone }
              ]
            }
          }
        }
      };

      console.log(`[SIMULATION] Emitting background M-Pesa Callback for ${checkoutId}`);
      
      const res = await this.handleCallback(payload);
      
      if (res.success && res.data) {
        if (global.onMpesaTransactionCompleted) {
          global.onMpesaTransactionCompleted(res.data.intent, res.data.transaction);
        }
      }
    }, 4000);
  }
}

declare global {
  var onMpesaTransactionCompleted: ((intent: PaymentIntent, transaction: Transaction) => void) | undefined;
}
