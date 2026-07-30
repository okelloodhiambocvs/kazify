import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import nodemailer from 'nodemailer';
import webpush from 'web-push';

export interface NotificationPreferences {
  id: string;
  user_id: string;
  enable_websocket: boolean;
  enable_push: boolean;
  enable_email: boolean;
  enable_sms: boolean;
  created_at: string;
  updated_at: string;
}

export interface PushSubscriptionRecord {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

export interface NotificationJobPayload {
  id: string;
  userId: string;
  title: string;
  content: string;
  channels: ('websocket' | 'push' | 'email' | 'sms')[];
  metadata?: any;
  created_at: string;
}

export interface QueueJobStatus {
  id: string;
  userId: string;
  title: string;
  state: 'queued' | 'active' | 'completed' | 'failed';
  progress: number;
  attemptsMade: number;
  failedReason?: string;
  timestamp: string;
}

export let notificationPreferencesList: NotificationPreferences[] = [];
export let pushSubscriptionsList: PushSubscriptionRecord[] = [];
export let mockQueueJobs: QueueJobStatus[] = [];

class NotificationServiceEngine {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private redisConnection: Redis | null = null;
  private emailTransporter: nodemailer.Transporter | null = null;
  private isBullMqActive = false;

  constructor() {
    this.initializeWebPushVapidKeys();
    this.initializeEmailTransporter();
    this.initializeQueueEngine();
  }

  private initializeWebPushVapidKeys() {
    const vapidPublic = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa30M3pT4j8pC_L8Q7sU1N4z9X8W3Y2Z1A0B1C2D3E4F5G6H7I8J9K0L';
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY || 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2';
    const vapidEmail = process.env.VAPID_EMAIL || 'mailto:support@kazify.com';

    try {
      webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate);
      console.log('[NOTIFICATIONS] VAPID keys registered for WebPush browser push notifications.');
    } catch (err: any) {
      console.warn('[NOTIFICATIONS] WebPush VAPID setup warning:', err.message);
    }
  }

  private initializeEmailTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587');
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });
      console.log(`[NOTIFICATIONS] SMTP email delivery configured using host ${smtpHost}`);
    } else {
      console.log('[NOTIFICATIONS] SMTP credentials omitted. Operating email channel in simulation console mode.');
    }
  }

  private initializeQueueEngine() {
    const redisHost = process.env.REDIS_HOST;
    const useRedis = process.env.USE_REDIS === 'true' || (!!redisHost && process.env.USE_REDIS !== 'false');

    if (useRedis && redisHost) {
      try {
        const redisPort = parseInt(process.env.REDIS_PORT || '6379');
        const redisPassword = process.env.REDIS_PASSWORD || undefined;

        const connectionOptions = {
          host: redisHost,
          port: redisPort,
          password: redisPassword,
          maxRetriesPerRequest: null,
          connectTimeout: 2000
        };

        this.queue = new Queue('kazify_notification_queue', { connection: connectionOptions });
        
        this.worker = new Worker(
          'kazify_notification_queue',
          async (job: Job<NotificationJobPayload>) => {
            console.log(`[BULLMQ WORKER] Processing notification job ${job.id} for user ${job.data.userId}`);
            await this.processNotificationDispatch(job.data);
          },
          { connection: connectionOptions }
        );

        this.worker.on('completed', (job) => {
          console.log(`[BULLMQ SUCCESS] Job ${job.id} completed successfully.`);
          this.updateMockQueueJobStatus(job.id || '', 'completed', 100);
        });

        this.worker.on('failed', (job, err) => {
          console.error(`[BULLMQ FAILED] Job ${job?.id} failed: ${err.message}`);
          if (job?.id) {
            this.updateMockQueueJobStatus(job.id, 'failed', 0, err.message);
          }
        });

        this.isBullMqActive = true;
        console.log('[NOTIFICATIONS] BullMQ queue engine initialized with Redis cluster.');
      } catch (err: any) {
        console.warn('[NOTIFICATIONS] Redis connection for BullMQ failed. Falling back to inline async queue:', err.message);
        this.isBullMqActive = false;
      }
    } else {
      console.log('[NOTIFICATIONS] Redis not enabled. Notifications dispatched via resilient fallback in-memory executor.');
      this.isBullMqActive = false;
    }
  }

  public async dispatchNotification(payload: Omit<NotificationJobPayload, 'id' | 'created_at'>): Promise<string> {
    const jobId = `notif_job_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const fullPayload: NotificationJobPayload = {
      id: jobId,
      ...payload,
      created_at: new Date().toISOString()
    };

    const initialStatus: QueueJobStatus = {
      id: jobId,
      userId: payload.userId,
      title: payload.title,
      state: 'queued',
      progress: 0,
      attemptsMade: 0,
      timestamp: new Date().toISOString()
    };
    mockQueueJobs.unshift(initialStatus);

    if (this.isBullMqActive && this.queue) {
      try {
        await this.queue.add('dispatch_multichannel', fullPayload, {
          jobId,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000
          }
        });
        return jobId;
      } catch (err: any) {
        console.warn('[NOTIFICATIONS] BullMQ enqueue error. Executing fallback dispatch.', err.message);
      }
    }

    setTimeout(async () => {
      this.updateMockQueueJobStatus(jobId, 'active', 30);
      try {
        await this.processNotificationDispatch(fullPayload);
        this.updateMockQueueJobStatus(jobId, 'completed', 100);
      } catch (err: any) {
        this.updateMockQueueJobStatus(jobId, 'failed', 0, err.message);
      }
    }, 100);

    return jobId;
  }

  private async processNotificationDispatch(payload: NotificationJobPayload) {
    const userPref = notificationPreferencesList.find(p => p.user_id === payload.userId) || {
      id: `pref_${payload.userId}`,
      user_id: payload.userId,
      enable_websocket: true,
      enable_push: true,
      enable_email: true,
      enable_sms: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const channels = payload.channels || ['websocket', 'push', 'email'];

    if (channels.includes('websocket') && userPref.enable_websocket) {
      this.dispatchWebSocketChannel(payload);
    }

    if (channels.includes('push') && userPref.enable_push) {
      await this.dispatchPushChannel(payload);
    }

    if (channels.includes('email') && userPref.enable_email) {
      await this.dispatchEmailChannel(payload);
    }

    if (channels.includes('sms') && userPref.enable_sms) {
      await this.dispatchSmsChannel(payload);
    }
  }

  private dispatchWebSocketChannel(payload: NotificationJobPayload) {
    if (global.sendWSNotificationToUser) {
      global.sendWSNotificationToUser(payload.userId, {
        id: `notif_${Date.now()}`,
        title: payload.title,
        content: payload.content,
        metadata: payload.metadata,
        created_at: payload.created_at
      });
      console.log(`[CHANNEL: WEBSOCKET] Dispatched real-time frame to user ${payload.userId}`);
    }
  }

  private async dispatchPushChannel(payload: NotificationJobPayload) {
    const userSubs = pushSubscriptionsList.filter(s => s.user_id === payload.userId);
    if (userSubs.length === 0) {
      console.log(`[CHANNEL: PUSH] No active push subscription endpoints for user ${payload.userId}`);
      return;
    }

    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.content,
      icon: '/icon.png',
      badge: '/badge.png',
      data: payload.metadata || {}
    });

    for (const sub of userSubs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };
        await webpush.sendNotification(pushSubscription, pushPayload);
        console.log(`[CHANNEL: PUSH SUCCESS] Delivered WebPush payload to endpoint ${sub.endpoint.substring(0, 30)}...`);
      } catch (err: any) {
        console.warn(`[CHANNEL: PUSH ERROR] Failed pushing to endpoint: ${err.message}`);
        if (err.statusCode === 410 || err.statusCode === 404) {
          const idx = pushSubscriptionsList.findIndex(s => s.id === sub.id);
          if (idx !== -1) pushSubscriptionsList.splice(idx, 1);
        }
      }
    }
  }

  private async dispatchEmailChannel(payload: NotificationJobPayload) {
    const targetEmail = payload.metadata?.email || `user_${payload.userId}@kazify.com`;

    if (this.emailTransporter) {
      try {
        await this.emailTransporter.sendMail({
          from: '"Kazify Services" <no-reply@kazify.com>',
          to: targetEmail,
          subject: `[KAZIFY] ${payload.title}`,
          text: payload.content,
          html: `
            <div style="font-family: sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; rounded: 12px;">
              <h2 style="color: #38bdf8;">${payload.title}</h2>
              <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1;">${payload.content}</p>
              <hr style="border-color: #334155;" />
              <p style="font-size: 12px; color: #64748b;">Kazify Skilled Trades & Escrow Engine | Kisumu, Kenya</p>
            </div>
          `
        });
        console.log(`[CHANNEL: EMAIL SUCCESS] Transmitted email to ${targetEmail}`);
      } catch (err: any) {
        console.error(`[CHANNEL: EMAIL ERROR] Failed sending to ${targetEmail}: ${err.message}`);
      }
    } else {
      console.log(`[CHANNEL: EMAIL SIMULATION] To: ${targetEmail} | Subject: ${payload.title} | Body: ${payload.content}`);
    }
  }

  private async dispatchSmsChannel(payload: NotificationJobPayload) {
    const targetPhone = payload.metadata?.phone || '+254700000000';
    console.log(`[CHANNEL: SMS SIMULATION] Target: ${targetPhone} | Content: "${payload.title}: ${payload.content}"`);
  }

  public registerPushSubscription(userId: string, subscription: { endpoint: string; keys: { p256dh: string; auth: string } }) {
    const existing = pushSubscriptionsList.find(s => s.endpoint === subscription.endpoint);
    if (!existing) {
      const rec: PushSubscriptionRecord = {
        id: `sub_${Date.now()}`,
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        created_at: new Date().toISOString()
      };
      pushSubscriptionsList.push(rec);
      console.log(`[NOTIFICATIONS] Registered new WebPush endpoint for user ${userId}`);
    }
  }

  public updateNotificationPreferences(userId: string, prefs: Partial<NotificationPreferences>) {
    let existing = notificationPreferencesList.find(p => p.user_id === userId);
    if (!existing) {
      existing = {
        id: `pref_${userId}`,
        user_id: userId,
        enable_websocket: prefs.enable_websocket ?? true,
        enable_push: prefs.enable_push ?? true,
        enable_email: prefs.enable_email ?? true,
        enable_sms: prefs.enable_sms ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      notificationPreferencesList.push(existing);
    } else {
      Object.assign(existing, prefs);
      existing.updated_at = new Date().toISOString();
    }
    return existing;
  }

  private updateMockQueueJobStatus(jobId: string, state: 'queued' | 'active' | 'completed' | 'failed', progress: number, failedReason?: string) {
    const job = mockQueueJobs.find(j => j.id === jobId);
    if (job) {
      job.state = state;
      job.progress = progress;
      if (failedReason) job.failedReason = failedReason;
    }
  }
}

export const NotificationEngine = new NotificationServiceEngine();

declare global {
  var sendWSNotificationToUser: ((userId: string, notification: any) => void) | undefined;
}
