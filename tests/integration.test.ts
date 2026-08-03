import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import dotenv from 'dotenv';
import { validateEnvironment } from '../server/services/securityHardening';
import { authRouter } from '../server/routes/auth';
import { adminRouter } from '../server/routes/admin';
import { escrowRouter } from '../server/routes/escrow';
import { customerRouter } from '../server/routes/customer';
import { commonRouter } from '../server/routes/common';
import { jobs, users } from '../server/state';

// Set high-entropy JWT secrets for test runner environment
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_with_sufficient_length_32bytes_plus_super_secure';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_with_sufficient_length_32bytes_plus';

dotenv.config();

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api', adminRouter);
app.use('/api', escrowRouter);
app.use('/api', customerRouter);
app.use('/api', commonRouter);

describe('Kazify Integration Test Suite', () => {

  let adminToken: string;
  let customerToken: string;
  let customerId: string;
  let bannedUserToken: string;
  let bannedUserId: string;
  let testJobId: string;

  beforeAll(() => {
    validateEnvironment();
  });

  describe('1. Authentication & Public Registration (No Admin)', () => {
    it('should successfully login seed customer and return JWT access and refresh tokens', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'customer@kazify.com',
          password: 'Customer@123'
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('accessToken');
      
      expect(res.headers['set-cookie']).toBeDefined();
      
      const cookies = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie']
      : [];
      
      expect(
        
        cookies.some(cookie => cookie.startsWith('refreshToken='))
      ).toBe(true);

    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.role).toBe('customer');
    customerToken = res.body.accessToken;
    customerId = res.body.user.id;
  });

    it('should allow public registration for customer role', async () => {
      const uniquePhone = `+254799${Math.floor(100000 + Math.random() * 900000)}`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `testcustomer_${Date.now()}@example.com`,
          phone: uniquePhone,
          name: 'Integration Test Customer',
          password: 'Password@123',
          role: 'customer'
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.role).toBe('customer');
    });

    it('should allow public registration for fundi role', async () => {
      const uniquePhone = `+254788${Math.floor(100000 + Math.random() * 900000)}`;
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `testfundi_${Date.now()}@example.com`,
          phone: uniquePhone,
          name: 'Integration Test Fundi',
          password: 'Password@123',
          role: 'fundi',
          category: 'Plumbing'
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user.role).toBe('fundi');

      bannedUserId = res.body.user.id;

      // Log in as this newly registered fundi to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: res.body.user.email,
          password: 'Password@123'
        });
      bannedUserToken = loginRes.body.accessToken;
    });

    it('STRICT SECURITY RULE: should REJECT public registration for admin role with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hacker_admin@example.com',
          phone: '+254700999999',
          name: 'Attempted Rogue Admin',
          password: 'Password@123',
          role: 'admin'
        });

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/disabled/i);
    });
  });

  describe('2. Admin Operations & Authoritative Ban Checks', () => {
    it('should authenticate admin account successfully', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@kazify.com',
          password: 'Admin@12345'
        });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('admin');
      adminToken = res.body.accessToken;
    });

    it('should allow admin to ban a target user', async () => {
      const res = await request(app)
        .post(`/api/admin/users/${bannedUserId}/ban`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/banned/i);
    });

    it('should re-validate ban status against authoritative store and block banned user access', async () => {
      const res = await request(app)
        .get('/api/customer/jobs')
        .set('Authorization', `Bearer ${bannedUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/banned|suspended/i);
    });
  });

  describe('3. Escrow Funding & Release Flow', () => {
    it('should allow customer to post a job and create an escrow account', async () => {
      const jobRes = await request(app)
        .post('/api/customer/jobs')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          title: 'Emergency Pipe Repair Test',
          category: 'Plumbing',
          amount: 5500,
          location: 'Westlands, Nairobi',
          description: 'Leaking pipe under sink'
        });

      expect(jobRes.status).toBe(201);
      testJobId = jobRes.body.id;
      expect(testJobId).toBeDefined();

      // Fund Escrow for the newly created job
      const fundRes = await request(app)
        .post('/api/escrow/fund')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          jobId: testJobId,
          amount: 5500
        });

      expect(fundRes.status).toBe(200);
      expect(fundRes.body.account).toBeDefined();
      expect(fundRes.body.account.status).toBe('held');
      expect(fundRes.body.account.amount).toBe(5500);
    });

    it('should allow customer to release escrow funds upon work completion', async () => {
      const releaseRes = await request(app)
        .post('/api/escrow/release')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          jobId: testJobId
        });

      expect(releaseRes.status).toBe(200);
      expect(releaseRes.body.message).toMatch(/released/i);
      expect(releaseRes.body.settlement).toBeDefined();
      expect(releaseRes.body.settlement.amount_net).toBeGreaterThan(0);
    });
  });

  describe('4. M-Pesa STK Push Happy Path & Webhook Verification', () => {
    let stkCheckoutId: string;

    it('should trigger M-Pesa STK Push happy path and return CheckoutRequestID', async () => {
      const res = await request(app)
        .post('/api/mpesa/stkpush')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          phoneNumber: '0712345678',
          amount: 3000,
          jobId: testJobId
        });

      expect(res.status).toBe(200);
      expect(res.body.checkoutRequestId).toBeDefined();
      stkCheckoutId = res.body.checkoutRequestId;
      expect(res.body.isSimulated).toBe(true);
    });

    it('should receive and process M-Pesa callback webhook for confirmed transaction', async () => {
      const webhookSecret = process.env.MPESA_WEBHOOK_SECRET || 'kazify_secret_webhook_token_2026';
      const callbackPayload = {
        Body: {
          stkCallback: {
            MerchantRequestID: 'MR_TEST_12345',
            CheckoutRequestID: stkCheckoutId,
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 3000 },
                { Name: 'MpesaReceiptNumber', Value: 'QGH9876543' },
                { Name: 'PhoneNumber', Value: 254712345678 }
              ]
            }
          }
        }
      };

      const res = await request(app)
        .post(`/api/mpesa/callback?secret=${webhookSecret}`)
        .send(callbackPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

});