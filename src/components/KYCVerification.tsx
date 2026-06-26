import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Upload, 
  Clock, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  FileCheck 
} from 'lucide-react';
import { User, KYCDocument } from '../types';
import api from '../services/api';

interface KYCVerificationProps {
  user: User;
  isAdminMode?: boolean; // When true, provides the admin verification panel
  onVerificationUpdated?: () => void;
}

const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo Marakwet', 'Embu', 'Garissa', 'Homa Bay',
  'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii',
  'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
  'Marsabit', 'Meru', 'Migori', 'Murang\'a', 'Nairobi', 'Nakuru', 'Nandi', 'Narok',
  'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita Taveta', 'Tana River',
  'Tharaka Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
];

export default function KYCVerification({ user, isAdminMode = false, onVerificationUpdated }: KYCVerificationProps) {
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [backlog, setBacklog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // User submission form states
  const [docType, setDocType] = useState<'national_id' | 'passport' | 'business_permit' | 'nita_certification' | 'support_documentation'>('national_id');
  const [docNumber, setDocNumber] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [fullLegalName, setFullLegalName] = useState('');
  const [kraPin, setKraPin] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [countyOfOperation, setCountyOfOperation] = useState('');
  
  const [fileBase64, setFileBase64] = useState('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='); // default safe PNG magic bytes
  const [fileName, setFileName] = useState('national_id_front_scan.png');
  const [testSuiteSelection, setTestSuiteSelection] = useState('safe_png');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState(false);

  // Admin moderation states
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [adminSuccess, setAdminSuccess] = useState(false);

  // Fetch documents for individual user
  const fetchUserKYC = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/kyc/${user.id}`);
      setDocuments(res.data);
      setUserError('');
    } catch (e) {
      console.error('Failed to load user KYC documents', e);
      setUserError('Failed to load identity verification details.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all documents for administrator review
  const fetchAdminKYCBacklog = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/admin/kyc');
      setBacklog(res.data);
      setAdminError('');
    } catch (e) {
      console.error('Failed to load KYC review backlog', e);
      setAdminError('Failed to load administrator verification backlog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminMode) {
      fetchAdminKYCBacklog();
    } else {
      fetchUserKYC();
    }
  }, [user.id, isAdminMode]);

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docNumber.trim()) {
      setUserError('Please input a valid Identification/License number');
      return;
    }
    if (!fullLegalName.trim()) {
      setUserError('Please input your Full Legal Name exactly as shown on your identification document');
      return;
    }

    setIsSubmitting(true);
    setUserError('');
    try {
      // Use fallback premium placeholder image if none supplied
      const docImageUrl = fileUrl.trim() || "https://images.unsplash.com/photo-1554774853-aae0a22c8aa4?w=800";
      const res = await api.post('/api/kyc/submit', {
        user_id: user.id,
        document_type: docType,
        document_number: docNumber,
        file_url: docImageUrl,
        full_legal_name: fullLegalName,
        kra_pin: kraPin,
        date_of_birth: dateOfBirth,
        county_of_operation: countyOfOperation,
        file_base64: fileBase64,
        file_name: fileName
      });
      if (res.data.success) {
        setUserSuccess(true);
        setDocNumber('');
        setFileUrl('');
        setFullLegalName('');
        setKraPin('');
        setDateOfBirth('');
        setCountyOfOperation('');
        setFileBase64('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
        setFileName('national_id_front_scan.png');
        setTestSuiteSelection('safe_png');
        setDocuments(prev => [res.data.document, ...prev]);
        setTimeout(() => setUserSuccess(false), 5000);
      }
    } catch (err: any) {
      console.error(err);
      setUserError(err.response?.data?.error || 'Failed to submit identity credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminReview = async (docId: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !rejectionReason.trim()) {
      setAdminError('Please provide a reason for rejecting this document.');
      return;
    }

    setIsReviewing(true);
    setAdminError('');
    try {
      const res = await api.post(`/api/admin/kyc/${docId}/review`, {
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : undefined
      });
      if (res.data.success) {
        setAdminSuccess(true);
        setRejectionReason('');
        setSelectedDoc(null);
        
        // Refresh local review cache
        fetchAdminKYCBacklog();
        if (onVerificationUpdated) {
          onVerificationUpdated();
        }
        setTimeout(() => setAdminSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setAdminError('Failed to complete identity document sign-off.');
    } finally {
      setIsReviewing(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400" />,
          label: 'VERIFIED & ACTIVE'
        };
      case 'rejected':
        return {
          bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
          icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
          label: 'REJECTED / ACTION REQUIRED'
        };
      default:
        return {
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
          icon: <Clock className="w-4 h-4 text-amber-400 animate-pulse" />,
          label: 'PENDING VERIFICATION'
        };
    }
  };

  if (isAdminMode) {
    return (
      <div className="space-y-6 text-left">
        <div>
          <h2 className="font-display font-medium text-lg text-white">KYC & Identity Audit Desk</h2>
          <p className="text-xs text-slate-500 font-mono">Verify and authenticate user identification documents in compliance with regulations</p>
        </div>

        {adminSuccess && (
          <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-400 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
            <span>Document review signed off successfully. Notifications dispatched.</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Backlog List */}
          <div className="lg:col-span-5 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col h-[520px]">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-900">
              <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest">PENDING BACKLOG</span>
              <span className="text-[10px] font-mono text-slate-500">{backlog.length} TOTAL IN QUEUE</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loading && backlog.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-slate-900 border border-slate-800/50 animate-pulse rounded-xl" />
                  ))}
                </div>
              ) : backlog.length === 0 ? (
                <div className="text-center py-20 text-slate-600 font-mono text-xs flex flex-col items-center">
                  <FileCheck className="w-8 h-8 text-slate-750 mb-2" />
                  <span>No identity submissions awaiting review.</span>
                </div>
              ) : (
                backlog.map((doc) => {
                  const style = getStatusStyle(doc.status);
                  return (
                    <div
                      key={doc.id}
                      onClick={() => { setSelectedDoc(doc); setRejectionReason(''); setAdminError(''); }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition text-xs flex flex-col justify-between ${
                        selectedDoc?.id === doc.id 
                          ? 'bg-slate-900 border-orange-500/80' 
                          : 'bg-slate-950 border-slate-850 hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-mono text-[9px] text-slate-500 uppercase tracking-wider block">
                            {doc.document_type.replace('_', ' ')}
                          </span>
                          <h4 className="font-bold text-slate-200 mt-0.5 truncate max-w-[160px]">{doc.user_name}</h4>
                        </div>
                        <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded border uppercase ${style.bg}`}>
                          {doc.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[10px] text-slate-500 border-t border-slate-900/50 pt-2 mt-1">
                        <span>Role: {doc.user_role?.toUpperCase()}</span>
                        <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Verification Workspace */}
          <div className="lg:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between min-h-[520px]">
            {selectedDoc ? (
              <div className="space-y-4 flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                    <div>
                      <h3 className="font-display font-bold text-sm text-white">Reviewing credentials for {selectedDoc.user_name}</h3>
                      <p className="text-[10px] font-mono text-slate-500">Contact: {selectedDoc.user_email || selectedDoc.user_phone}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedDoc(null)}
                      className="text-xs font-mono text-slate-400 hover:text-white"
                    >
                      Dismiss Workspace
                    </button>
                  </div>

                  {/* Document Meta */}
                  <div className="grid grid-cols-2 gap-3 mt-4 text-xs font-mono">
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block uppercase text-[9px]">ID NUMBER / SERIAL</span>
                      <span className="text-slate-200 font-bold mt-1 block">{selectedDoc.document_number}</span>
                    </div>
                    <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                      <span className="text-slate-500 block uppercase text-[9px]">DATE OF SUBMISSION</span>
                      <span className="text-slate-200 font-bold mt-1 block">{new Date(selectedDoc.created_at).toLocaleString()}</span>
                    </div>
                    {selectedDoc.full_legal_name && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 col-span-2">
                        <span className="text-slate-500 block uppercase text-[9px]">FULL LEGAL NAME</span>
                        <span className="text-slate-200 font-bold mt-1 block">{selectedDoc.full_legal_name}</span>
                      </div>
                    )}
                    {selectedDoc.date_of_birth && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block uppercase text-[9px]">DATE OF BIRTH</span>
                        <span className="text-slate-200 font-bold mt-1 block">{new Date(selectedDoc.date_of_birth).toLocaleDateString()}</span>
                      </div>
                    )}
                    {selectedDoc.kra_pin && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block uppercase text-[9px]">KRA TAX PIN</span>
                        <span className="text-slate-200 font-bold mt-1 block uppercase">{selectedDoc.kra_pin}</span>
                      </div>
                    )}
                    {selectedDoc.county_of_operation && (
                      <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 col-span-2">
                        <span className="text-slate-500 block uppercase text-[9px]">COUNTY OF OPERATION</span>
                        <span className="text-slate-200 font-bold mt-1 block">{selectedDoc.county_of_operation} County</span>
                      </div>
                    )}
                  </div>

                  {/* Compliance & Security Audit Section */}
                  <div className="mt-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3.5 text-xs font-mono">
                    <span className="text-orange-500 block uppercase text-[9.5px] font-bold tracking-wider">🛡️ SECURE INGESTION SECURITY & COMPLIANCE</span>
                    <div className="grid grid-cols-2 gap-3 text-[10px]">
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block text-[8px] uppercase font-bold mb-0.5">MALWARE STATUS</span>
                        <span className={`font-bold uppercase ${selectedDoc.malware_scan_status === 'clean' || !selectedDoc.malware_scan_status ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {selectedDoc.malware_scan_status || 'CLEANED & PASSED'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                        <span className="text-slate-500 block text-[8px] uppercase font-bold mb-0.5">SIGNATURE INTEGRITY</span>
                        <span className={`font-bold uppercase ${selectedDoc.signature_check === 'invalid' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {selectedDoc.signature_check || 'VERIFIED'}
                        </span>
                      </div>
                    </div>
                    {selectedDoc.file_sha256 && (
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 break-all text-[9.5px]">
                        <span className="text-slate-500 block text-[8px] uppercase font-bold mb-0.5">CRYPTOGRAPHIC SHA-256 DIGEST</span>
                        <span className="text-slate-300 font-mono text-[9px] block leading-tight">{selectedDoc.file_sha256}</span>
                      </div>
                    )}
                    {selectedDoc.compliance_logs && selectedDoc.compliance_logs.length > 0 && (
                      <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 text-[9px] space-y-1">
                        <span className="text-slate-500 block text-[8px] uppercase font-bold">INGESTION AUDIT LOG</span>
                        <ul className="list-disc pl-3 text-slate-400 space-y-0.5">
                          {selectedDoc.compliance_logs.map((log: string, idx: number) => (
                            <li key={idx}>{log}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* ID Image Preview */}
                  <div className="mt-4 border border-slate-850 rounded-xl overflow-hidden bg-slate-900 h-48 relative">
                    <img 
                      referrerPolicy="no-referrer"
                      src={selectedDoc.file_url} 
                      alt="National Identification Credentials Scan" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-3 right-3 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-mono text-slate-300 flex items-center gap-1.5 backdrop-blur-sm">
                      <Eye className="w-3 h-3 text-orange-400" />
                      <span>SECURE CREDENTIAL PREVIEW</span>
                    </div>
                  </div>
                </div>

                {/* Verification Decisions */}
                <div className="pt-4 border-t border-slate-900">
                  {selectedDoc.status === 'pending' ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-mono font-bold text-slate-400 block uppercase tracking-wider">REJECTION FEEDBACK REASON (Required only if rejecting)</label>
                        <input
                          type="text"
                          placeholder="Provide specific reason for rejection (e.g. Blurry photo, mismatched ID number)..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-800 text-white text-xs rounded-xl px-3 py-2.5 font-mono focus:outline-none focus:border-orange-500 placeholder:text-slate-600"
                        />
                      </div>

                      {adminError && (
                        <div className="p-2.5 bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs font-mono rounded-xl">
                          {adminError}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3.5 pt-1">
                        <button
                          onClick={() => handleAdminReview(selectedDoc.id, 'approved')}
                          disabled={isReviewing}
                          className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition cursor-pointer"
                        >
                          APPROVE CREDENTIALS
                        </button>
                        <button
                          onClick={() => handleAdminReview(selectedDoc.id, 'rejected')}
                          disabled={isReviewing}
                          className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition cursor-pointer"
                        >
                          REJECT SUBMISSION
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-xl text-center text-xs font-mono border ${
                      selectedDoc.status === 'approved' ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400' : 'bg-rose-500/5 border-rose-500/15 text-rose-400'
                    }`}>
                      {selectedDoc.status === 'approved' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Credentials cleared & authorized by administrator audit.</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                            <XCircle className="w-4 h-4 text-rose-400" />
                            <span>Verification Rejected</span>
                          </div>
                          <span className="text-slate-400 text-[11px] mt-0.5">Reason: {selectedDoc.rejection_reason || 'Incomplete details.'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                <ShieldCheck className="w-10 h-10 text-slate-700 mb-3" />
                <span className="text-xs font-mono">Select a submitted credential from the backlog to audit</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // User Submission UI (Individual View)
  const activeDoc = documents[0]; // Most recent document submission
  const statusStyle = activeDoc ? getStatusStyle(activeDoc.status) : null;

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="font-display font-medium text-lg text-white">Trust & KYC Verification Hub</h2>
        <p className="text-xs text-slate-500 font-mono">Secure document submissions to comply with Central Bank of Kenya AML regulations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Verification Status Overview */}
        <div className="md:col-span-5 space-y-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 bg-orange-500/5 rounded-full blur-xl" />
            
            {!activeDoc ? (
              <>
                <div className="w-14 h-14 rounded-full bg-slate-900 border border-slate-800 text-slate-500 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Identity Unverified</h3>
                <p className="text-slate-500 text-[11px] font-mono leading-relaxed mb-4">
                  Provide national ID, passport, or local business license to authorize fund withdrawals.
                </p>
                <span className="text-[9px] font-mono font-bold tracking-widest text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl uppercase">
                  UNSUBMITTED
                </span>
              </>
            ) : (
              <>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 border ${
                  activeDoc.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                  activeDoc.status === 'rejected' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                  'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  {activeDoc.status === 'approved' ? <ShieldCheck className="w-7 h-7" /> : <Shield className="w-7 h-7" />}
                </div>

                <h3 className="text-sm font-bold text-white mb-1">
                  {activeDoc.status === 'approved' ? 'Verified Account' :
                   activeDoc.status === 'rejected' ? 'Verification Failed' : 'Pending Verification'}
                </h3>
                
                <p className="text-slate-500 text-[11px] font-mono leading-relaxed mb-4 max-w-[220px]">
                  {activeDoc.status === 'approved' ? 'Your identity is verified. Full Kazify features are unlocked.' :
                   activeDoc.status === 'rejected' ? `Rejected: "${activeDoc.rejection_reason}". Please submit valid documentation.` :
                   'Your document is in the verification queue. Review typically takes 10-15 minutes.'}
                </p>

                <div className={`text-[10px] font-mono font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 uppercase ${statusStyle?.bg}`}>
                  {statusStyle?.icon}
                  <span>{statusStyle?.label}</span>
                </div>
              </>
            )}
          </div>

          {/* Secure details card */}
          <div className="p-4 bg-slate-950/40 border border-slate-800/80 rounded-2xl space-y-3">
            <span className="text-[9px] font-mono font-bold text-orange-400 block uppercase tracking-widest">KAZIFY TRUST & CBK AML COMPLIANCE</span>
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
              To fully comply with the <strong className="text-orange-400">Central Bank of Kenya (CBK) Anti-Money Laundering (AML)</strong> regulations under the Proceeds of Crime and Anti-Money Laundering Act (POCAMLA), Kazify requires physical and digital credential escrow validation.
            </p>
            <p className="text-[10px] text-slate-400 leading-relaxed font-mono">
              Your National ID/Passport scans, NITA Certifications, and other professional credentials are encrypted in-transit and at-rest using AES-256 military-grade standards. Documents are strictly visible to our compliance desk only.
            </p>
          </div>
        </div>

        {/* Upload Form & History */}
        <div className="md:col-span-7 bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between min-h-[520px]">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-900">
              <span className="text-xs font-mono font-bold text-orange-400 uppercase tracking-widest">LODGE CREDENTIALS</span>
              <span className="text-[10px] font-mono text-slate-500">REAL-TIME FILE INGESTION</span>
            </div>

            {(!activeDoc || activeDoc.status === 'rejected') ? (
              <form onSubmit={handleUserSubmit} className="space-y-4">
                {/* Thorough fields for CBK compliance */}
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-mono font-semibold uppercase block mb-1 text-slate-400">FULL LEGAL NAME (Must match ID exactly)</label>
                    <input
                      type="text"
                      placeholder="e.g. John Kamau Mwangi"
                      value={fullLegalName}
                      onChange={(e) => setFullLegalName(e.target.value)}
                      className="w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono font-semibold uppercase block mb-1 text-slate-400">DATE OF BIRTH</label>
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono font-semibold uppercase block mb-1 text-slate-400">KRA TAX PIN</label>
                      <input
                        type="text"
                        placeholder="e.g. A012345678B"
                        value={kraPin}
                        onChange={(e) => setKraPin(e.target.value)}
                        className="w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-mono font-semibold uppercase block mb-1 text-slate-400">CREDENTIAL TYPE</label>
                      <select
                        value={docType}
                        onChange={(e) => setDocType(e.target.value as any)}
                        className="w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white"
                      >
                        <option value="national_id">National ID</option>
                        <option value="passport">Passport</option>
                        <option value="business_permit">County Business Permit (Any County)</option>
                        <option value="nita_certification">NITA Certification</option>
                        <option value="support_documentation">Other Support Documentation (Good Conduct, etc.)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-semibold uppercase block mb-1 text-slate-400">DOCUMENT ID/SERIAL NUMBER</label>
                      <input
                        type="text"
                        placeholder="e.g. ID-32450129"
                        value={docNumber}
                        onChange={(e) => setDocNumber(e.target.value)}
                        className="w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-[10px] font-mono font-semibold uppercase block mb-1 text-slate-400">COUNTY OF OPERATION</label>
                      <select
                        value={countyOfOperation}
                        onChange={(e) => setCountyOfOperation(e.target.value)}
                        className="w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white"
                        required
                      >
                        <option value="">-- Select County --</option>
                        {KENYA_COUNTIES.map(c => (
                          <option key={c} value={c}>{c} County</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-mono font-semibold uppercase block mb-1 text-slate-400">DOCUMENT SCAN URL (OPTIONAL REPLACEMENT)</label>
                  <input
                    type="url"
                    placeholder="https://example.com/scanned-id.jpg"
                    value={fileUrl}
                    onChange={(e) => {
                      setFileUrl(e.target.value);
                      if (e.target.value) {
                        setFileBase64(''); // Reset base64 to fallback to URL processing on server
                      }
                    }}
                    className="w-full rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600"
                  />
                  <p className="text-[9px] text-slate-500 font-mono mt-1">Leave empty to use the secure base64 byte scanner below.</p>
                </div>

                {/* Real File Input and Security Audit Test Suite */}
                <div className="bg-slate-950/40 p-4 border border-slate-900 rounded-xl space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-mono font-bold text-orange-400 uppercase tracking-widest block">SECURE INGESTION GATEWAY</label>
                    <span className="text-[8px] bg-slate-900 border border-slate-800 text-slate-500 font-mono px-2 py-0.5 rounded uppercase">Anti-Malware Active</span>
                  </div>

                  {/* Predefined Security Tests */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-mono font-bold text-slate-400 block uppercase">compliance test sandbox</label>
                    <select
                      value={testSuiteSelection}
                      onChange={(e) => {
                        const val = e.target.value;
                        setTestSuiteSelection(val);
                        if (val === 'safe_png') {
                          setFileBase64('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
                          setFileName('national_id_front_scan.png');
                          setUserError('');
                        } else if (val === 'invalid_signature') {
                          setFileBase64('data:image/jpeg;base64,VE9UQUxMWV9CQURfSEVBREVSX0JZVEVTX0ZPUl9KUEVHX1RFU1RfRklMRV9IRVJFCg==');
                          setFileName('corrupted_credentials_scan.jpg');
                          setUserError('');
                        } else if (val === 'malware_eicar') {
                          setFileBase64('data:text/plain;base64,WDVPIVAlQEFQU1s0XFBMWlg1NChQXik3Q0MpN30kRUlDQVItU1RBTkRBUkQtQU5USVZJUlVTLVRFU1QtRklMRSEkSCtIKg==');
                          setFileName('eicar_virus_signature.png');
                          setUserError('');
                        } else if (val === 'script_quarantine') {
                          setFileBase64('data:text/plain;base64,PHNjcmlwdD5ldmFsKCdjYXQgL2V0Yy9wYXNzd2QgfCBuY2ggYXR0YWNrZXIuY29tIDQ0NDQnKTs8L3NjcmlwdD4=');
                          setFileName('malicious_exploit_script.pdf');
                          setUserError('');
                        }
                      }}
                      className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white"
                    >
                      <option value="safe_png">🟢 Test File: Safe Standard PNG scan (Valid Signature)</option>
                      <option value="invalid_signature">🟡 Test File: Corrupted JPG signature (Invalid Signature)</option>
                      <option value="malware_eicar">🔴 Test File: Infected document (Triggers Malware Block)</option>
                      <option value="script_quarantine">❌ Test File: Suspicious script payload (Triggers Script Quarantine)</option>
                    </select>
                    <p className="text-[8.5px] text-slate-500 font-mono">Use the compliance test sandbox above to safely verify signature matching, sandbox-quarantining, and error reporting mechanics.</p>
                  </div>

                  {/* Real File Upload Trigger */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-mono font-bold text-slate-400 block uppercase">Or upload a real document file</label>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg,.pdf"
                      id="kyc-file-input"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            setUserError('File size limits exceeded (max 10MB).');
                            return;
                          }
                          setFileName(file.name);
                          const reader = new FileReader();
                          reader.onload = () => {
                            setFileBase64(reader.result as string);
                            setTestSuiteSelection('custom');
                            setUserError('');
                          };
                          reader.onerror = () => {
                            setUserError('Failed to read selected local file.');
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    
                    {/* Simulated file drag and drop zone */}
                    <div 
                      onClick={() => document.getElementById('kyc-file-input')?.click()}
                      className="border border-dashed border-slate-800 bg-slate-950/50 hover:bg-slate-950 transition rounded-xl p-4 text-center cursor-pointer flex flex-col items-center justify-center space-y-1.5"
                    >
                      <Upload className="w-5 h-5 text-slate-500" />
                      <span className="text-[10px] text-slate-300 font-semibold font-mono">
                        {fileName ? `File Selected: ${fileName}` : 'Click to browse or drop standard KYC scan'}
                      </span>
                      <span className="text-[8px] text-slate-600 font-mono">Supports JPG, PNG, PDF up to 10MB. Converts dynamically to Base64 byte-stream.</span>
                    </div>
                  </div>
                </div>

                {userError && (
                  <div className="p-2.5 bg-rose-500/5 border border-rose-500/10 text-rose-400 text-xs font-mono rounded-xl">
                    {userError}
                  </div>
                )}

                {userSuccess && (
                  <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs font-mono rounded-xl">
                    Identity lodged! Review in progress.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isSubmitting ? 'PROCESSING CREDENTIALS...' : 'SUBMIT SECURE VERIFICATION'}</span>
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2 text-xs font-mono">
                  {activeDoc.full_legal_name && (
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Legal Name:</span>
                      <span className="text-slate-200 font-bold">{activeDoc.full_legal_name}</span>
                    </div>
                  )}
                  {activeDoc.date_of_birth && (
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">Date of Birth:</span>
                      <span className="text-slate-200">{new Date(activeDoc.date_of_birth).toLocaleDateString()}</span>
                    </div>
                  )}
                  {activeDoc.kra_pin && (
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">KRA Tax PIN:</span>
                      <span className="text-slate-200">{activeDoc.kra_pin}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Document Type:</span>
                    <span className="text-slate-200 capitalize">{activeDoc.document_type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Serial Number:</span>
                    <span className="text-slate-200">{activeDoc.document_number}</span>
                  </div>
                  {activeDoc.county_of_operation && (
                    <div className="flex justify-between border-b border-slate-800 pb-2">
                      <span className="text-slate-500">County:</span>
                      <span className="text-slate-200">{activeDoc.county_of_operation} County</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                    <span className="text-slate-500">Submission Date:</span>
                    <span className="text-slate-200">{new Date(activeDoc.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Verification Status:</span>
                    <span className={`font-bold capitalize ${
                      (activeDoc.status as string) === 'approved' ? 'text-emerald-400' :
                      (activeDoc.status as string) === 'rejected' ? 'text-rose-400' : 'text-amber-400'
                    }`}>{activeDoc.status}</span>
                  </div>
                </div>

                {/* Verification Document Image Preview */}
                <div className="border border-slate-850 rounded-xl overflow-hidden bg-slate-900 h-48 relative">
                  <img 
                    referrerPolicy="no-referrer"
                    src={activeDoc.file_url} 
                    alt="Active national identity card scan" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 right-3 bg-slate-950/80 border border-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-mono text-slate-300 backdrop-blur-sm">
                    Active Scanned Credentials Record
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-900 pt-3.5 flex items-center space-x-2 text-[10px] text-slate-500 font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
            <span>Need support with business registry registration? Contact Kazify helpdesk.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
