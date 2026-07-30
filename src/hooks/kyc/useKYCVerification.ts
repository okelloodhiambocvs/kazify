import { useState, useEffect } from 'react';
import { User, KYCDocument } from '../../types';
import api from '../../services/api';

export const KENYA_COUNTIES = [
  'Baringo', 'Bomet', 'Bungoma', 'Busia', 'Elgeyo Marakwet', 'Embu', 'Garissa', 'Homa Bay',
  'Isiolo', 'Kajiado', 'Kakamega', 'Kericho', 'Kiambu', 'Kilifi', 'Kirinyaga', 'Kisii',
  'Kisumu', 'Kitui', 'Kwale', 'Laikipia', 'Lamu', 'Machakos', 'Makueni', 'Mandera',
  'Marsabit', 'Meru', 'Migori', 'Murang\'a', 'Nairobi', 'Nakuru', 'Nandi', 'Narok',
  'Nyamira', 'Nyandarua', 'Nyeri', 'Samburu', 'Siaya', 'Taita Taveta', 'Tana River',
  'Tharaka Nithi', 'Trans Nzoia', 'Turkana', 'Uasin Gishu', 'Vihiga', 'Wajir', 'West Pokot'
];

interface UseKYCVerificationProps {
  user: User;
  isAdminMode?: boolean;
  onVerificationUpdated?: () => void;
}

export function useKYCVerification({ user, isAdminMode = false, onVerificationUpdated }: UseKYCVerificationProps) {
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
  
  const [fileBase64, setFileBase64] = useState('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==');
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
    setIsReviewing(true);
    setAdminError('');
    try {
      const res = await api.post('/api/admin/kyc/review', {
        document_id: docId,
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : undefined
      });
      if (res.data.success) {
        setAdminSuccess(true);
        setSelectedDoc(null);
        setRejectionReason('');
        fetchAdminKYCBacklog();
        if (onVerificationUpdated) onVerificationUpdated();
        setTimeout(() => setAdminSuccess(false), 4000);
      }
    } catch (err: any) {
      console.error(err);
      setAdminError(err.response?.data?.error || 'Failed to update document status.');
    } finally {
      setIsReviewing(false);
    }
  };

  return {
    documents,
    backlog,
    loading,
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
    fileBase64,
    setFileBase64,
    fileName,
    setFileName,
    testSuiteSelection,
    setTestSuiteSelection,
    isSubmitting,
    userError,
    setUserError,
    userSuccess,
    selectedDoc,
    setSelectedDoc,
    rejectionReason,
    setRejectionReason,
    isReviewing,
    adminError,
    setAdminError,
    adminSuccess,
    handleUserSubmit,
    handleAdminReview
  };
}
