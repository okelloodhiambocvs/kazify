import { useState } from 'react';
import api from '../../services/api';
import { preloadService } from '../../services/preloadService';

export function useAdminKYC() {
  const [kycDocs, setKycDocs] = useState<any[]>([]);
  const [selectedKyc, setSelectedKyc] = useState<any | null>(null);
  const [rejReason, setRejReason] = useState('');

  const fetchKycDocs = async () => {
    try {
      const preloadKey = 'admin-kyc';
      const promise = preloadService.get(preloadKey) || api.get('/api/admin/kyc');
      preloadService.clear(preloadKey);
      const res = await promise;
      setKycDocs(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setKycDocs([]);
    }
  };

  const handleReviewKyc = async (
    docId: string, 
    status: 'approved' | 'rejected',
    onSuccess?: () => void
  ) => {
    try {
      await api.post(`/api/admin/kyc/${docId}/review`, {
        status,
        rejection_reason: status === 'rejected' ? rejReason : undefined
      });
      setRejReason('');
      setSelectedKyc(null);
      fetchKycDocs();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
    }
  };

  return {
    kycDocs,
    selectedKyc,
    setSelectedKyc,
    rejReason,
    setRejReason,
    fetchKycDocs,
    handleReviewKyc
  };
}
