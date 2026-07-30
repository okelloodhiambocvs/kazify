import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Upload, Clock, CreditCard, Camera } from 'lucide-react';
import { User, KYCDocument } from '../types';
import api from '../services/api';

interface KYCTabProps {
  user: User;
}

export default function KYCTab({ user }: KYCTabProps) {
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState<'national_id' | 'passport' | 'business_permit' | 'nita_certification' | 'support_documentation'>('national_id');
  const [docNumber, setDocNumber] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const fetchKYC = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/kyc/${user.id}`);
      setDocuments(res.data);
    } catch (e) {
      console.error('Failed to load KYC docs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKYC();
  }, [user.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      setError('Please provide document identification number');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.post('/api/kyc/submit', {
        user_id: user.id,
        document_type: docType,
        document_number: docNumber,
        file_url: fileUrl || "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400"
      });
      if (res.data.success) {
        setSuccess(true);
        setDocNumber('');
        setFileUrl('');
        setDocuments(prev => [res.data.document, ...prev]);
        setTimeout(() => setSuccess(false), 5000);
      }
    } catch (err: any) {
      setError('Failed to lodge KYC submission');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 px-3 py-1 rounded-full uppercase tracking-wider">APPROVED & VERIFIED</span>;
      case 'pending':
        return <span className="text-[10px] font-bold bg-amber-500/10 border border-amber-500/25 text-amber-400 px-3 py-1 rounded-full uppercase tracking-wider">PENDING REVIEW</span>;
      default:
        return <span className="text-[10px] font-bold bg-rose-500/10 border border-rose-500/25 text-rose-400 px-3 py-1 rounded-full uppercase tracking-wider">REJECTED / RESUBMIT</span>;
    }
  };

  const activeDoc = documents[0]; // Get the latest submission

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="font-display font-medium text-lg text-white">Trust & KYC Identity Center</h2>
        <p className="text-xs text-slate-500 font-mono">Government identity verification in compliance with Kenyan payments regulations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Status indicator / Submission details */}
        <div className="md:col-span-4 space-y-4">
          <div className="bg-slate-950/85 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center">
            {(!activeDoc) && (
              <>
                <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-4 scale-110">
                  <Shield className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Identity Unverified</h3>
                <p className="text-slate-500 text-[11px] font-mono leading-relaxed mb-4">
                  Please submit verification documentation to activate payouts.
                </p>
                <span className="text-[9px] font-mono font-semibold tracking-wider text-slate-500 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
                  VERIFICATION REQUIRED
                </span>
              </>
            )}

            {activeDoc && activeDoc.status === 'pending' && (
              <>
                <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 scale-110">
                  <Clock className="w-7 h-7 animate-pulse" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Identity Under Review</h3>
                <p className="text-slate-500 text-[11px] font-mono leading-relaxed mb-4">
                  Administrators are reviewing document #{activeDoc.document_number.substring(0, 10)}.
                </p>
                {getStatusBadge(activeDoc.status)}
              </>
            )}

            {activeDoc && activeDoc.status === 'approved' && (
              <>
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 scale-110">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Account fully Secured</h3>
                <p className="text-slate-400 text-[11px] font-mono leading-relaxed mb-4">
                  Clearing complete! Your digital wallet deposits and bidding rights are active.
                </p>
                {getStatusBadge(activeDoc.status)}
              </>
            )}

            {activeDoc && activeDoc.status === 'rejected' && (
              <>
                <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mb-4 scale-110">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Verification Failed</h3>
                <p className="text-rose-400 text-[11px] font-mono leading-relaxed mb-4">
                  Reason: {activeDoc.rejection_reason || 'Incomplete or blurry image'}.
                </p>
                {getStatusBadge(activeDoc.status)}
              </>
            )}
          </div>
        </div>

        {/* Form panel */}
        <div className="md:col-span-8">
          {(!activeDoc || activeDoc.status === 'rejected') ? (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6">
              <h3 className="text-sm font-bold text-white mb-1">Lodge Verification Document</h3>
              <p className="text-xs text-slate-500 font-mono mb-6">Double-check credentials for match with register names</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 text-slate-400">DOCUMENT TYPE</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="national_id">National ID Card</option>
                      <option value="passport">Passport Booklet</option>
                      <option value="business_permit">Single Business Permit (Unified)</option>
                      <option value="nita_certification">NITA Certification</option>
                      <option value="support_documentation">Other Support Documentation (Good Conduct, etc.)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 text-slate-400">DOCUMENT NUMBER</label>
                    <input
                      type="text"
                      placeholder="e.g. ID or Passport number"
                      value={docNumber}
                      onChange={(e) => setDocNumber(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1.5 text-slate-400">SELECT ATTACHMENT SIMULATOR</label>
                  <select
                    value={fileUrl}
                    onChange={(e) => setFileUrl(e.target.value)}
                    className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white"
                  >
                    <option value="">National ID Template Front & Back</option>
                    <option value="https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=500">Kenyan Passport Pages Bio</option>
                    <option value="https://images.unsplash.com/photo-1543269865-cbf427effbad?w=500">Business Registration Certificate</option>
                  </select>
                </div>

                {/* Drag and Drop Simulation UI */}
                <div className="border-2 border-dashed border-slate-800 rounded-2xl p-6 text-center hover:border-orange-500/50 transition cursor-pointer flex flex-col items-center">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mb-3">
                    <Upload className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold block text-slate-200">Drag & Drop document scan or click to browse</span>
                  <span className="text-[10px] font-mono text-slate-500 mt-1 block">Supports PDF, PNG, JPG up to 10MB</span>
                </div>

                {error && (
                  <div className="text-rose-400 text-xs font-mono p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="text-emerald-400 text-xs font-mono p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Lodge submission logged successfully! Pending administrator review.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'UPLOADING SCAN...' : 'SUBMIT FOR VERIFICATION'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col h-[320px] justify-between">
              <div>
                <h3 className="text-sm font-bold text-white mb-2">Submitted Document Scan</h3>
                <span className="text-xs text-slate-500 font-mono">Verified attachment on encrypted regional archives</span>

                <div className="mt-4 rounded-xl border border-slate-900 overflow-hidden bg-slate-900 max-h-[160px] relative">
                  <img
                    referrerPolicy="no-referrer"
                    src={activeDoc.file_url || "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=400"}
                    alt="Scan preview"
                    className="w-full h-full object-cover max-h-[160px] opacity-80"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent flex items-end p-3">
                    <span className="text-[10px] font-mono font-bold text-orange-400 capitalize">
                      {activeDoc.document_type.replace('_', ' ')}: #{activeDoc.document_number}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 border-t border-slate-800 pt-4">
                <Clock className="w-3.5 h-3.5" />
                <span>Last updated: {new Date(activeDoc.updated_at).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
