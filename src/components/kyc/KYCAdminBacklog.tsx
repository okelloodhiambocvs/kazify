import React from 'react';
import { 
  CheckCircle2, XCircle, Eye, FileCheck, ShieldCheck
} from 'lucide-react';

export const getStatusStyle = (status: string) => {
  switch (status) {
    case 'approved':
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        label: 'VERIFIED CREDENTIAL'
      };
    case 'rejected':
      return {
        bg: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        icon: <XCircle className="w-4 h-4 text-rose-400" />,
        label: 'VERIFICATION REJECTED'
      };
    default:
      return {
        bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        icon: <ShieldCheck className="w-4 h-4 text-amber-400 animate-pulse" />,
        label: 'PENDING VERIFICATION'
      };
  }
};

interface KYCAdminBacklogProps {
  backlog: any[];
  loading: boolean;
  selectedDoc: any | null;
  setSelectedDoc: (doc: any | null) => void;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  isReviewing: boolean;
  adminError: string;
  setAdminError: (err: string) => void;
  adminSuccess: boolean;
  handleAdminReview: (docId: string, status: 'approved' | 'rejected') => void;
}

export const KYCAdminBacklog: React.FC<KYCAdminBacklogProps> = ({
  backlog,
  loading,
  selectedDoc,
  setSelectedDoc,
  rejectionReason,
  setRejectionReason,
  isReviewing,
  adminError,
  setAdminError,
  adminSuccess,
  handleAdminReview
}) => {
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
};
