import { useState, useEffect, useCallback } from 'react';
import { User, Job, ChatMessage } from '../../types';
import api from '../../services/api';

export function useFundiChat(selectedJobId?: string) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (selectedJobId) {
      api.get(`/api/chats/${selectedJobId}`)
        .then(res => setChatMessages(res.data))
        .catch(err => console.error('Chat fetch failed', err));
    } else {
      setChatMessages([]);
    }
  }, [selectedJobId]);

  const addChatMessage = useCallback((msg: ChatMessage) => {
    setChatMessages((prev) => [...prev, msg]);
  }, []);

  const handleSendChatMsg = async (selectedJob: Job | null, user: User) => {
    if (!newMessage.trim() || !selectedJob) return;
    try {
      const res = await api.post('/api/chats', {
        job_id: selectedJob.id,
        sender_id: user.id,
        sender_name: user.name,
        message: newMessage
      });
      const msg = res.data;
      setChatMessages((prev) => [...prev, msg]);
      setNewMessage('');
    } catch (e) {
      console.error('Chat error', e);
    }
  };

  return {
    chatMessages,
    setChatMessages,
    addChatMessage,
    newMessage,
    setNewMessage,
    handleSendChatMsg
  };
}
