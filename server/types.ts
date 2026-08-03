import express from 'express';
import { EscrowAccount } from './services/escrowService';

export interface AuthenticatedRequest extends express.Request {
  user?: {
    id: string;
    email: string;
    role: 'customer' | 'fundi' | 'admin';
    name: string;
  };
}

export interface LocalUser {
  id: string;
  phone: string;
  email: string;
  name: string;
  role: 'customer' | 'fundi' | 'admin';
  password?: string;
  password_hash?: string;
  avatar_url?: string;
  rating?: number;
  category?: string;
  subcategories?: string[];
  bio?: string;
  hourly_rate?: number;
  jobs_completed?: number;
  kyc_verified?: boolean;
  status?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  is_email_verified?: boolean;
  email_verification_token?: string;
  password_reset_token?: string;
  password_reset_expires?: string;
  availability?: any;
  created_at?: string;
}

export interface LocalBid {
  id: string;
  job_id: string;
  fundi_id: string;
  fundi_name: string;
  fundi_rating?: number;
  amount: number;
  note?: string;
  proposal?: string;
  duration_days?: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface LocalJob {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone?: string;
  title: string;
  description: string;
  category: string;
  workflow?: 'instant' | 'quotation';
  status: 'pending' | 'matching' | 'open' | 'in_progress' | 'accepted' | 'en_route' | 'started' | 'completed' | 'cancelled' | 'disputed' | 'released' | 'refunded';
  lat?: number;
  lng?: number;
  address?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  fundi_id?: string;
  fundi_name?: string;
  fundi_phone?: string;
  assigned_fundi_id?: string;
  assigned_fundi_name?: string;
  fundi_lat?: number;
  fundi_lng?: number;
  amount: number;
  bids_count?: number;
  estimated_duration?: string;
  escrow_status?: 'unpaid' | 'held' | 'released' | 'refunded' | 'disputed';
  created_at: string;
  is_rated?: boolean;
  bids?: LocalBid[];
  fraud_flags?: string[];
  ai_matching_score?: number;
  recommended_fundis?: any[];
}

export interface LocalChatMessage {
  id: string;
  job_id: string;
  sender_id: string;
  sender_name: string;
  receiver_id?: string;
  message?: string;
  content?: string;
  created_at: string;
}

export interface LocalEscrowTransaction {
  id: string;
  job_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  type: 'stk_push' | 'payout' | 'refund';
  phone_number: string;
  checkout_request_id?: string;
  created_at: string;
}

export interface LocalNotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface LocalReview {
  id: string;
  job_id?: string;
  fundi_id: string;
  customer_id: string;
  customer_name: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface LocalWallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  updated_at: string;
}

export interface LocalWalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'commission' | 'refund';
  description: string;
  reference_id?: string;
  created_at: string;
  job_id?: string;
  status?: 'pending' | 'completed' | 'failed';
}

export type LocalEscrowAccount = EscrowAccount;

export interface LocalDisputeEvidenceAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  caption?: string;
  uploaded_at: string;
}

export interface LocalDispute {
  id: string;
  job_id: string;
  job_title?: string;
  initiator_id?: string;
  initiator_name?: string;
  customer_id?: string;
  customer_name?: string;
  fundi_id?: string;
  fundi_name?: string;
  amount?: number;
  reason: string;
  description?: string;
  status: 'open' | 'pending' | 'resolved' | 'resolved_refunded' | 'resolved_released' | 'cancelled';
  resolution_summary?: string;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
  completion_percentage?: number;
  evidence_attachments?: LocalDisputeEvidenceAttachment[];
}

export interface LocalDisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface LocalKYCDocument {
  id: string;
  user_id: string;
  document_type: 'national_id' | 'passport' | 'business_permit';
  document_number: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  full_legal_name?: string;
  kra_pin?: string;
  date_of_birth?: string;
  county_of_operation?: string;
  file_sha256?: string;
  malware_scan_status?: string;
  signature_check?: string;
  compliance_logs?: string[];
}

export interface LocalContract {
  id: string;
  job_id: string;
  customer_id: string;
  customer_name: string;
  fundi_id: string;
  fundi_name: string;
  amount: number;
  terms: string;
  customer_signed: boolean;
  fundi_signed: boolean;
  customer_signed_at?: string;
  fundi_signed_at?: string;
  status: 'draft' | 'active' | 'completed' | 'terminated';
  created_at: string;
  updated_at?: string;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: 'user' | 'job' | 'dispute' | 'system' | 'escrow';
  targetId: string;
  details: string;
}

export interface FraudAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId: string;
  userName: string;
  details: string;
  status: 'open' | 'investigating' | 'resolved';
  createdAt: string;
}
