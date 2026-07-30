import { useState, useEffect, useRef } from 'react';
import { User, Dispute, DisputeMessage, DisputeEvidenceAttachment } from '../../types';
import api from '../../services/api';

export const PRESET_EVIDENCE_EXHIBITS = [
  {
    name: "Unfinished Plumbing.jpg",
    type: "image/jpeg",
    url: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80",
    caption: "Water pipe connection left completely disconnected and leaking onto floor boards."
  },
  {
    name: "Faulty Wiring Hazard.jpg",
    type: "image/jpeg",
    url: "https://images.unsplash.com/photo-1558224494-ef8b4172f45f?auto=format&fit=crop&w=600&q=80",
    caption: "Electrical socket box left unscrewed with hazardous exposed live wires in the kitchen."
  },
  {
    name: "Abandoned Site Tools.jpg",
    type: "image/jpeg",
    url: "https://images.unsplash.com/photo-1534224039826-c7a0dea0e66a?auto=format&fit=crop&w=600&q=80",
    caption: "Tradesperson tools left scattered. Service provider did not return for 3 consecutive days."
  }
];

interface UseDisputePanelProps {
  jobId: string;
  user: User;
  onStateChanged?: () => void;
}

export function useDisputePanel({ jobId, user, onStateChanged }: UseDisputePanelProps) {
  const [dispute, setDispute] = useState<Dispute | null>(null);
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Raise form state
  const [reason, setReason] = useState('Unsatisfactory Quality of Work');
  const [description, setDescription] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState<number>(40);
  const [attachments, setAttachments] = useState<DisputeEvidenceAttachment[]>([]);
  const [isRaising, setIsRaising] = useState(false);
  const [error, setError] = useState('');
  const [isFormExpanded, setIsFormExpanded] = useState(false);

  // Attachment caption auxiliary states
  const [currentCaption, setCurrentCaption] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Modal view state for evidence zoom
  const [activeZoomExhibit, setActiveZoomExhibit] = useState<DisputeEvidenceAttachment | null>(null);

  // Message compose
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const fetchDispute = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/disputes/job/${jobId}`);
      setDispute(res.data);
      setError('');
      
      // Load messages
      const msgRes = await api.get(`/api/disputes/${res.data.id}/messages`);
      setMessages(msgRes.data);
    } catch (e) {
      console.error('Failed to load dispute for job', e);
      setDispute(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDispute();
  }, [jobId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (fileList: FileList) => {
    Array.from(fileList).forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const newAttachment: DisputeEvidenceAttachment = {
            id: `ev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            file_name: file.name,
            file_type: file.type,
            file_url: event.target.result as string,
            caption: currentCaption.trim() || `Uploaded proof of ${reason.toLowerCase()}`,
            uploaded_at: new Date().toISOString()
          };
          setAttachments(prev => [...prev, newAttachment]);
          setCurrentCaption('');
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAttachPreset = (preset: typeof PRESET_EVIDENCE_EXHIBITS[0]) => {
    const newAttachment: DisputeEvidenceAttachment = {
      id: `ev_preset_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file_name: preset.name,
      file_type: preset.type,
      file_url: preset.url,
      caption: preset.caption,
      uploaded_at: new Date().toISOString()
    };
    setAttachments(prev => [...prev, newAttachment]);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(att => att.id !== id));
  };

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a detailed description of the issue.');
      return;
    }

    setIsRaising(true);
    setError('');
    try {
      const res = await api.post('/api/disputes/raise', {
        job_id: jobId,
        initiator_id: user.id,
        reason,
        description,
        completion_percentage: completionPercentage,
        evidence_attachments: attachments
      });
      if (res.data.success) {
        setDispute(res.data.dispute);
        if (onStateChanged) onStateChanged();
        fetchDispute();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to lodge dispute');
    } finally {
      setIsRaising(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !dispute) return;

    setSendingMessage(true);
    try {
      const res = await api.post(`/api/disputes/${dispute.id}/message`, {
        sender_id: user.id,
        sender_name: user.name,
        message: newMessage
      });
      setMessages(prev => [...prev, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setSendingMessage(false);
    }
  };

  return {
    dispute,
    messages,
    loading,
    reason,
    setReason,
    description,
    setDescription,
    completionPercentage,
    setCompletionPercentage,
    attachments,
    isRaising,
    error,
    isFormExpanded,
    setIsFormExpanded,
    currentCaption,
    setCurrentCaption,
    dragActive,
    activeZoomExhibit,
    setActiveZoomExhibit,
    newMessage,
    setNewMessage,
    sendingMessage,
    messagesEndRef,
    handleDrag,
    handleDrop,
    handleFileChange,
    handleAttachPreset,
    removeAttachment,
    handleRaiseDispute,
    handleSendMessage
  };
}
