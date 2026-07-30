import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Job, ChatMessage } from '../../types';
import api from '../../services/api';
import { preloadService } from '../../services/preloadService';

export function useFundiJobs(
  user: User,
  propsNotifications?: any[],
  setNotifications?: React.Dispatch<React.SetStateAction<any[]>>,
  refreshTrigger: number = 0,
  onNewChatMessage?: (msg: ChatMessage) => void
) {
  const [assignedJobs, setAssignedJobs] = useState<Job[]>([]);
  const [availableBiddingJobs, setAvailableBiddingJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const [localNotifications, setLocalNotifications] = useState<any[]>([]);
  const notifications =
    propsNotifications !== undefined
      ? propsNotifications
      : localNotifications;
  const setNotificationsState =
    setNotifications || setLocalNotifications;

  const selectedJobRef = useRef<Job | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    selectedJobRef.current = selectedJob;
  }, [selectedJob]);

  const fetchFundiJobs = useCallback(async () => {
    try {
      const preloadKey = `fundi-jobs-${user.id}`;
      const promise =
        preloadService.get(preloadKey) ||
        api.get(`/api/jobs?role=fundi&user_id=${user.id}`);

      preloadService.clear(preloadKey);

      const res = await promise;

      const data = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.jobs)
        ? res.data.jobs
        : [];

      const assigned = data.filter(
        (j: Job) => j.fundi_id === user.id
      );

      const openForBids = data.filter(
        (j: Job) =>
          !j.fundi_id &&
          (j.status === 'pending' || j.status === 'matching')
      );

      setAssignedJobs(assigned);
      setAvailableBiddingJobs(openForBids);

      if (selectedJobRef.current) {
        const updated = data.find(
          (j: Job) => j.id === selectedJobRef.current?.id
        );

        if (updated) {
          setSelectedJob(updated);
        }
      }
    } catch (e) {
      console.error('Fundi job lists loading error', e);
      setAssignedJobs([]);
      setAvailableBiddingJobs([]);
    }
  }, [user.id]);

  const fetchNotifications = useCallback(async () => {
    try {
      const preloadKey = `fundi-notifications-${user.id}`;

      const promise =
        preloadService.get(preloadKey) ||
        api.get(`/api/notifications?user_id=${user.id}`);

      preloadService.clear(preloadKey);

      const res = await promise;

      const notifs = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.data?.notifications)
        ? res.data.notifications
        : [];

      setNotificationsState(notifs);
    } catch (e) {
      console.error('Notifications check error', e);
      setNotificationsState([]);
    }
  }, [user.id, setNotificationsState]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchFundiJobs();
      fetchNotifications();
    }
  }, [refreshTrigger, fetchFundiJobs, fetchNotifications]);

  useEffect(() => {
    fetchFundiJobs();
    fetchNotifications();

    // Prevent duplicate websocket connections in React Strict Mode
    if (
      socketRef.current &&
      (socketRef.current.readyState === WebSocket.OPEN ||
        socketRef.current.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = localStorage.getItem('kazify_token');

    const protocol =
      window.location.protocol === 'https:' ? 'wss:' : 'ws:';

    const wsUrl =
      `${protocol}//${window.location.host}/ws` +
      (token
        ? `?token=${encodeURIComponent(token)}`
        : `?user_id=${user.id}`);

    console.log("[WS] Connecting to", wsUrl);
    console.log("[WS] Token", token);
    
    const socket = new WebSocket(wsUrl);

    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(
        JSON.stringify({
          type: 'auth',
          token: token || undefined,
          userId: user.id,
          user_id: user.id
        })
      );
    };

    socket.onclose = (event) => {
      // Ignore normal closures (including React StrictMode cleanup)
      if (event.code !== 1000) {
        console.warn(
          `[WebSocket] Closed (code=${event.code}, reason=${event.reason})`
        );
      }
    };

    socket.onerror = (error) => {
      console.error('[WebSocket] Error', error);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (
          payload.type === 'job_status_change' ||
          payload.type === 'new_instant_dispatch' ||
          payload.type === 'new_quotation_job' ||
          payload.type === 'escrow_received'
        ) {
          fetchFundiJobs();
        }

        if (
          payload.type === 'new_chat_message' &&
          onNewChatMessage
        ) {
          onNewChatMessage(payload.chatMessage);
        }

        if (payload.type === 'notification') {
          setNotificationsState((prev) => [
            payload.notification,
            ...prev
          ]);
        }
      } catch (err) {
        console.error('WS Fundi message block failure', err);
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [
    user.id,
    fetchFundiJobs,
    fetchNotifications,
    setNotificationsState,
    onNewChatMessage
  ]);

  const handleAcceptInstantJob = async (jobId: string) => {
    try {
      const res = await api.post(
        `/api/jobs/${jobId}/accept-instant`,
        {
          fundi_id: user.id
        }
      );

      fetchFundiJobs();
      setSelectedJob(res.data.job || res.data);
    } catch (err) {
      console.error('Accept dispatch failed', err);
    }
  };

  const handleProgressStatus = async (
    jobId: string,
    status: 'en_route' | 'started' | 'completed'
  ) => {
    try {
      await api.post(`/api/jobs/${jobId}/status`, {
        status
      });

      fetchFundiJobs();
    } catch (err) {
      console.error('Progress failed', err);
    }
  };

  return {
    assignedJobs,
    setAssignedJobs,
    availableBiddingJobs,
    setAvailableBiddingJobs,
    selectedJob,
    setSelectedJob,
    notifications,
    fetchFundiJobs,
    fetchNotifications,
    handleAcceptInstantJob,
    handleProgressStatus
  };
}