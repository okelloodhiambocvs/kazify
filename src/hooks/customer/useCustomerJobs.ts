import { useState, useEffect, useRef, useCallback } from 'react';
import { User, Job, EscrowTransaction, ChatMessage } from '../../types';
import api from '../../services/api';
import { preloadService } from '../../services/preloadService';

export function useCustomerJobs(
  user: User,
  propsNotifications?: any[],
  setNotifications?: React.Dispatch<React.SetStateAction<any[]>>,
  refreshTrigger: number = 0
) {
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [escrowTransactions, setEscrowTransactions] = useState<EscrowTransaction[]>([]);
  
  const [localNotifications, setLocalNotifications] = useState<any[]>([]);
  const notifications = propsNotifications !== undefined ? propsNotifications : localNotifications;
  const setNotificationsState = setNotifications || setLocalNotifications;

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const selectedJobRef = useRef<Job | null>(null);
  useEffect(() => {
    selectedJobRef.current = selectedJob;
  }, [selectedJob]);

  const fetchTransactions = useCallback(async () => {
    try {
      const preloadKey = 'customer-escrow-history';
      const promise = preloadService.get(preloadKey) || api.get('/api/escrow/history');
      preloadService.clear(preloadKey);
      
      const res = await promise;
      const transactions = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.data?.transactions)
      ? res.data.transactions
      : Array.isArray(res?.data?.history)
      ? res.data.history
      : [];
      setEscrowTransactions(transactions);

    } catch (e) {
      console.error('Failed to load escrow transaction ledger', e);
    }
  }, []);

  const fetchCustomerJobs = useCallback(async () => {
    try {
      const preloadKey = `customer-jobs-${user.id}`;
      const promise = preloadService.get(preloadKey) || api.get(`/api/jobs?role=customer&user_id=${user.id}`);
      preloadService.clear(preloadKey);
      const res = await promise;
      const data = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.jobs) ? res.data.jobs : []);
      setActiveJobs(data);
      
      if (selectedJobRef.current) {
        const updated = data.find((j: Job) => j.id === selectedJobRef.current?.id);
        if (updated) setSelectedJob(updated);
      }
    } catch (e) {
      console.error('Jobs fetch failed', e);
      setActiveJobs([]);
    }
  }, [user.id]);

  const fetchNotifications = useCallback(async () => {
    try {
      const preloadKey = `customer-notifications-${user.id}`;
      const promise = preloadService.get(preloadKey) || api.get(`/api/notifications?user_id=${user.id}`);
      preloadService.clear(preloadKey);
      const res = await promise;
      const notifs = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.data?.notifications) ? res.data.notifications : []);
      setNotificationsState(notifs);
    } catch (e) {
      console.error('Notifications fetch failed', e);
      setNotificationsState([]);
    }
  }, [user.id, setNotificationsState]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchCustomerJobs();
      fetchNotifications();
      fetchTransactions();
    }
  }, [refreshTrigger, fetchCustomerJobs, fetchNotifications, fetchTransactions]);

  useEffect(() => {
    fetchCustomerJobs();
    fetchNotifications();
    fetchTransactions();

    const token = localStorage.getItem('kazify_token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws` + (token ? `?token=${encodeURIComponent(token)}` : `?user_id=${user.id}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: 'auth',
        token: token || undefined,
        userId: user.id,
        user_id: user.id
      }));
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'job_status_change' || payload.type === 'new_bid' || payload.type === 'escrow_received') {
          fetchCustomerJobs();
          fetchTransactions();
        }
        if (payload.type === 'tracking_update') {
          setActiveJobs((prev) => 
            prev.map((j) => {
              if (j.id === payload.job_id) {
                return {
                  ...j,
                  fundi_lat: payload.fundi_location.lat,
                  fundi_lng: payload.fundi_location.lng,
                  estimated_duration: payload.eta
                };
              }
              return j;
            })
          );
          setSelectedJob((prev) => {
            if (prev && prev.id === payload.job_id) {
              return {
                ...prev,
                fundi_lat: payload.fundi_location.lat,
                fundi_lng: payload.fundi_location.lng,
                estimated_duration: payload.eta
              };
            }
            return prev;
          });
        }
        if (payload.type === 'new_chat_message') {
          setChatMessages((prev) => [...prev, payload.chatMessage]);
        }
        if (payload.type === 'notification') {
          setNotificationsState((prev) => [payload.notification, ...prev]);
        }
      } catch (err) {
        console.error('WS client message parse failed', err);
      }
    };

    return () => {
      socket.close();
    };
  }, [user.id, fetchCustomerJobs, fetchNotifications, fetchTransactions, setNotificationsState]);

  const handleAcceptBid = async (bidId: string) => {
    try {
      await api.post(`/api/bids/${bidId}/accept`);
      fetchCustomerJobs();
    } catch (e) {
      console.error('Bid accept error', e);
    }
  };

  const handleReleaseEscrow = async (jobId: string) => {
    try {
      await api.post(`/api/jobs/${jobId}/status`, { status: 'completed' });
      fetchCustomerJobs();
    } catch (e) {
      console.error('Release failed', e);
    }
  };

  const [isSubmittingActiveJobReview, setIsSubmittingActiveJobReview] = useState(false);

  const handleActiveJobReviewSubmit = async (jobId: string, fundiId: string, ratingValue?: number, commentValue?: string) => {
    setIsSubmittingActiveJobReview(true);
    try {
      await api.post('/api/reviews', {
        fundi_id: fundiId,
        customer_id: user.id,
        customer_name: user.name,
        rating: ratingValue !== undefined ? ratingValue : 5,
        comment: commentValue !== undefined ? commentValue : '',
        job_id: jobId
      });
      fetchCustomerJobs();
    } catch (e) {
      console.error('Failed to submit job review', e);
    } finally {
      setIsSubmittingActiveJobReview(false);
    }
  };

  return {
    activeJobs,
    setActiveJobs,
    selectedJob,
    setSelectedJob,
    escrowTransactions,
    notifications,
    chatMessages,
    setChatMessages,
    fetchCustomerJobs,
    fetchTransactions,
    fetchNotifications,
    handleAcceptBid,
    handleReleaseEscrow,
    isSubmittingActiveJobReview,
    handleActiveJobReviewSubmit
  };
}
