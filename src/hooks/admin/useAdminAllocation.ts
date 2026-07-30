import { useState } from 'react';
import api from '../../services/api';
import { preloadService } from '../../services/preloadService';

export function useAdminAllocation() {
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [selectedAllocationJob, setSelectedAllocationJob] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [isAllocating, setIsAllocating] = useState(false);
  const [allocationMessage, setAllocationMessage] = useState('');
  const [allocationSearch, setAllocationSearch] = useState('');
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);

  // Bulk selection and recommendations states
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkRecommendations, setBulkRecommendations] = useState<any[]>([]);
  const [loadingBulkRecommendations, setLoadingBulkRecommendations] = useState(false);
  const [bulkAllocationMessage, setBulkAllocationMessage] = useState('');
  const [isBulkAllocating, setIsBulkAllocating] = useState(false);

  const calculateGeodeticDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) return 0;
    const R = 6371; // Earth KM radius
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  };

  const fetchAllocationsJobs = async () => {
    setLoadingJobs(true);
    try {
      const preloadKey = 'admin-jobs';
      const promise = preloadService.get(preloadKey) || api.get('/api/jobs');
      preloadService.clear(preloadKey);
      const res = await promise;
      setJobsList(Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.jobs) ? res.data.jobs : []));
    } catch (e) {
      console.error('Failed to fetch allocations jobs', e);
      setJobsList([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const fetchRecommendations = async (jobId: string) => {
    setLoadingRecommendations(true);
    try {
      const res = await api.get(`/api/admin/jobs/${jobId}/recommendations`);
      setRecommendations(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to fetch recommendations', e);
      setRecommendations([]);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAllocate = async (jobId: string, fundiId: string, onSuccess?: () => void) => {
    setIsAllocating(true);
    setAllocationMessage('');
    try {
      const res = await api.post('/api/admin/allocate-fundi', { jobId, fundiId });
      setAllocationMessage(res.data.message || 'Tradesperson allocated successfully!');
      
      if (selectedAllocationJob && selectedAllocationJob.id === jobId) {
        setSelectedAllocationJob(res.data.job);
      }
      
      fetchAllocationsJobs();
      fetchRecommendations(jobId);
      if (onSuccess) onSuccess();
    } catch (e: any) {
      console.error(e);
      setAllocationMessage(e.response?.data?.error || 'Allocation failed. Please try again.');
    } finally {
      setIsAllocating(false);
    }
  };

  const fetchBulkRecommendations = async (ids: string[]) => {
    setLoadingBulkRecommendations(true);
    setBulkAllocationMessage('');
    try {
      const res = await api.post('/api/admin/jobs/bulk-recommendations', { jobIds: ids });
      const raw = Array.isArray(res?.data) ? res.data : [];
      const enriched = raw.map((item: any) => ({
        ...item,
        selectedCandidateId: item.bestCandidate?.id || ''
      }));
      setBulkRecommendations(enriched);
    } catch (e) {
      console.error('Failed to fetch bulk recommendations', e);
      setBulkRecommendations([]);
    } finally {
      setLoadingBulkRecommendations(false);
    }
  };

  const handleBulkAllocate = async (onSuccess?: () => void) => {
    setIsBulkAllocating(true);
    setBulkAllocationMessage('');
    try {
      const allocations = bulkRecommendations
        .filter((item: any) => item.selectedCandidateId)
        .map((item: any) => ({
          jobId: item.jobId,
          fundiId: item.selectedCandidateId
        }));

      if (allocations.length === 0) {
        setBulkAllocationMessage('Please select at least one tradesperson to allocate.');
        setIsBulkAllocating(false);
        return;
      }

      const res = await api.post('/api/admin/jobs/bulk-allocate', { allocations });
      setBulkAllocationMessage(res.data.message || 'Bulk allocation completed successfully!');
      
      setSelectedJobIds([]);
      fetchAllocationsJobs();
      if (onSuccess) onSuccess();
    } catch (e: any) {
      console.error(e);
      setBulkAllocationMessage(e.response?.data?.error || 'Bulk allocation failed. Please try again.');
    } finally {
      setIsBulkAllocating(false);
    }
  };

  return {
    jobsList,
    loadingJobs,
    selectedAllocationJob,
    setSelectedAllocationJob,
    recommendations,
    loadingRecommendations,
    isAllocating,
    allocationMessage,
    setAllocationMessage,
    allocationSearch,
    setAllocationSearch,
    isAllocationModalOpen,
    setIsAllocationModalOpen,
    selectedJobIds,
    setSelectedJobIds,
    isBulkModalOpen,
    setIsBulkModalOpen,
    bulkRecommendations,
    setBulkRecommendations,
    loadingBulkRecommendations,
    bulkAllocationMessage,
    isBulkAllocating,
    calculateGeodeticDistance,
    fetchAllocationsJobs,
    fetchRecommendations,
    handleAllocate,
    fetchBulkRecommendations,
    handleBulkAllocate
  };
}
