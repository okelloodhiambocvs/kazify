export type UserRole = 'customer' | 'fundi' | 'admin';

export interface User {
  id: string;
  phone: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url?: string;
  rating?: number;
  category?: string;
  status?: string; // e.g. 'available', 'busy', 'offline'
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
}

export type JobWorkflow = 'instant' | 'quotation';
export type JobStatus = 
  | 'pending' // Quote posted or matching nearest
  | 'matching' // Instant dispatch searching
  | 'accepted' // Fundi accepted
  | 'en_route' // Fundi is en route
  | 'started' // Job active
  | 'completed' // Job marked completed
  | 'cancelled'
  | 'disputed';

export interface Bid {
  id: string;
  job_id: string;
  fundi_id: string;
  fundi_name: string;
  fundi_rating: number;
  amount: number;
  note: string;
  duration_days: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Job {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  title: string;
  description: string;
  category: string;
  workflow: JobWorkflow;
  status: JobStatus;
  lat: number;
  lng: number;
  address: string;
  fundi_id?: string;
  fundi_name?: string;
  fundi_phone?: string;
  fundi_lat?: number;
  fundi_lng?: number;
  amount: number;
  estimated_duration?: string;
  escrow_status: 'unpaid' | 'held' | 'released' | 'refunded';
  created_at: string;
  is_rated?: boolean;
  bids?: Bid[];
  fraud_flags?: string[];
  ai_matching_score?: number;
  recommended_fundis?: RecommendedFundi[];
}

export interface RecommendedFundi {
  id: string;
  name: string;
  phone: string;
  rating: number;
  avatar_url?: string;
  status: 'available' | 'busy';
  distanceKM: number;
  address: string;
  isReliable: boolean;
}

export interface ChatMessage {
  id: string;
  job_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface EscrowTransaction {
  id: string;
  job_id: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  type: 'stk_push' | 'payout' | 'refund';
  phone_number: string;
  checkout_request_id?: string;
  created_at: string;
}

export interface SystemNotification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number; // KES
  currency: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  amount: number;
  type: 'deposit' | 'withdrawal' | 'escrow_hold' | 'escrow_release' | 'commission' | 'refund';
  description: string;
  reference_id?: string; // e.g. job_id or payment_id
  created_at: string;
}

export interface EscrowAccount {
  id: string;
  job_id: string;
  customer_id: string;
  fundi_id?: string;
  amount: number;
  commission_fee: number; // System fee (e.g. 10%)
  payout_amount: number; // Amount the fundi gets
  status: 'unpaid' | 'held' | 'released' | 'refunded' | 'disputed';
  created_at: string;
  updated_at: string;
}

export interface DisputeEvidenceAttachment {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  caption?: string;
  uploaded_at: string;
}

export interface Dispute {
  id: string;
  job_id: string;
  initiator_id: string;
  initiator_name: string;
  reason: string;
  description: string;
  status: 'pending' | 'resolved_refunded' | 'resolved_released' | 'cancelled';
  resolution_summary?: string;
  resolved_at?: string;
  created_at: string;
  completion_percentage?: number;
  evidence_attachments?: DisputeEvidenceAttachment[];
}

export interface DisputeMessage {
  id: string;
  dispute_id: string;
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

export interface KYCDocument {
  id: string;
  user_id: string;
  document_type: 'national_id' | 'passport' | 'business_permit' | 'nita_certification' | 'support_documentation';
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

export interface Contract {
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

