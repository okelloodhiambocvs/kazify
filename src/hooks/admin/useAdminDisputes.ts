import { useState } from 'react';
import { DisputeMessage, User } from '../../types';
import api from '../../services/api';
import { preloadService } from '../../services/preloadService';

export function useAdminDisputes(user: User) {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [selectedDispute, setSelectedDispute] = useState<any | null>(null);
  const [disputeMessages, setDisputeMessages] = useState<DisputeMessage[]>([]);
  const [newDisputeMsg, setNewDisputeMsg] = useState('');
  const [resSummary, setResSummary] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [adminZoomExhibit, setAdminZoomExhibit] = useState<any | null>(null);

  const fetchDisputes = async () => {
    try {
      const preloadKey = 'admin-disputes';
      const promise = preloadService.get(preloadKey) || api.get('/api/disputes');
      preloadService.clear(preloadKey);
      const res = await promise;
      setDisputes(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch disputes', e);
      setDisputes([]);
    }
  };

  const fetchDisputeMessages = async (disputeId: string) => {
    try {
      const res = await api.get(`/api/disputes/${disputeId}/messages`);
      setDisputeMessages(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error(e);
      setDisputeMessages([]);
    }
  };

  const handleSendDisputeMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDisputeMsg.trim() || !selectedDispute) return;
    try {
      const res = await api.post(`/api/disputes/${selectedDispute.id}/message`, {
        sender_id: user.id,
        sender_name: 'System Administrator (Arbitrator)',
        message: newDisputeMsg
      });
      setDisputeMessages(prev => [...prev, res.data]);
      setNewDisputeMsg('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleResolveDispute = async (
    resolution: 'resolved_released' | 'resolved_refunded',
    onSuccess?: () => void
  ) => {
    if (!selectedDispute || !resSummary.trim()) return;
    setIsResolving(true);
    try {
      await api.post(`/api/disputes/${selectedDispute.id}/resolve`, {
        resolution,
        resolution_summary: resSummary
      });
      setResSummary('');
      setSelectedDispute(null);
      fetchDisputes();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResolving(false);
    }
  };

  return {
    disputes,
    selectedDispute,
    setSelectedDispute,
    disputeMessages,
    newDisputeMsg,
    setNewDisputeMsg,
    resSummary,
    setResSummary,
    isResolving,
    adminZoomExhibit,
    setAdminZoomExhibit,
    fetchDisputes,
    fetchDisputeMessages,
    handleSendDisputeMessage,
    handleResolveDispute
  };
}
