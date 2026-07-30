import React from 'react';
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Upload
} from 'lucide-react';
import { KYCDocument } from '../../types';
import { KENYA_COUNTIES } from '../../hooks/kyc/useKYCVerification';
import { getStatusStyle } from './KYCAdminBacklog';

interface KYCUserSubmissionProps {
  documents: KYCDocument[];
  docType: 'national_id' | 'passport' | 'business_permit' | 'nita_certification' | 'support_documentation';
  setDocType: (val: any) => void;
  docNumber: string;
  setDocNumber: (val: string) => void;
  fileUrl: string;
  setFileUrl: (val: string) => void;
  fullLegalName: string;
  setFullLegalName: (val: string) => void;
  kraPin: string;
  setKraPin: (val: string) => void;
  dateOfBirth: string;
  setDateOfBirth: (val: string) => void;
  countyOfOperation: string;
  setCountyOfOperation: (val: string) => void;
  setFileBase64: (val: string) => void;
  fileName: string;
  setFileName: (val: string) => void;
  testSuiteSelection: string;
  setTestSuiteSelection: (val: string) => void;
  isSubmitting: boolean;
  userError: string;
  setUserError: (val: string) => void;
  userSuccess: boolean;
  handleUserSubmit: (e: React.FormEvent) => void;
}

export const KYCUserSubmission: React.FC<KYCUserSubmissionProps> = ({
  documents,
  docType,
  setDocType,
  docNumber,
  setDocNumber,
  fileUrl,
  setFileUrl,
  fullLegalName,
  setFullLegalName,
  kraPin,
  setKraPin,
  dateOfBirth,
  setDateOfBirth,
  countyOfOperation,
  setCountyOfOperation,
  setFileBase64,
  fileName,
  setFileName,
  testSuiteSelection,
  setTestSuiteSelection,
  isSubmitting,
  userError,
  setUserError,
  userSuccess,
  handleUserSubmit
}) => {
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
};
