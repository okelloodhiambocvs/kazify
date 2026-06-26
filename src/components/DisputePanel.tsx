import React, { useState, useEffect, useRef } from 'react';
import { 
  AlertTriangle, Send, ShieldAlert, CheckCircle2, MessageSquare, 
  Clock, Upload, X, Percent, Image as ImageIcon, Eye, FileText, 
  Info, ExternalLink, Sparkles 
} from 'lucide-react';
import { User, Dispute, DisputeMessage, DisputeEvidenceAttachment } from '../types';
import api from '../services/api';

interface DisputePanelProps {
  jobId: string;
  user: User;
  onStateChanged?: () => void;
}

// Interactive sample evidentiary presets to speed up testing in the workspace
const PRESET_EVIDENCE_EXHIBITS = [
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

export default function DisputePanel({ jobId, user, onStateChanged }: DisputePanelProps) {
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

  // Handle Drag Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle Drop Event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  // Handle manual file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  // Process files to Base64 data URLs
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

  // Quick attach preset evidence to make arbitration testing easy
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

  if (loading) {
    return (
      <div className="p-4 border border-slate-800 rounded-2xl bg-slate-950 animate-pulse space-y-2">
        <div className="h-4 w-1/3 bg-slate-900 rounded" />
        <div className="h-20 bg-slate-900 rounded" />
      </div>
    );
  }

  return (
    <div className="border border-slate-800 rounded-2xl bg-slate-950 p-5 text-left space-y-4" id={`dispute-panel-container-${jobId}`}>
      {/* Evidence zoom modal portal */}
      {activeZoomExhibit && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative bg-slate-950 max-w-2xl w-full border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-900 flex justify-between items-center bg-slate-950">
              <span className="text-xs font-mono font-bold text-slate-300 truncate max-w-[80%]">EXHIBIT IMAGE: {activeZoomExhibit.file_name}</span>
              <button 
                onClick={() => setActiveZoomExhibit(null)}
                className="p-1 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-900 flex items-center justify-center p-2 min-h-[300px] max-h-[480px] overflow-hidden">
              <img 
                src={activeZoomExhibit.file_url} 
                alt="Evidence View" 
                className="max-w-full max-h-[440px] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="p-4 bg-slate-950 border-t border-slate-900 space-y-1">
              <span className="text-[9px] font-mono text-orange-400 block font-bold uppercase tracking-widest">Client Provided Caption</span>
              <p className="text-xs text-slate-200 leading-relaxed font-mono">{activeZoomExhibit.caption || "No caption added."}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-800/80">
        <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Disputes Resolution Hub</h3>
          <span className="text-[10px] font-mono text-slate-500">Legal arbitration system & Escrow Freeze desk</span>
        </div>
      </div>

      {!dispute ? (
        !isFormExpanded ? (
          <div className="flex flex-col sm:flex-row items-center justify-between p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl gap-3 text-xs font-mono">
            <div className="flex items-center space-x-2 text-left">
              <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 animate-pulse" />
              <span className="text-slate-300">Experiencing completion or quality issues with this service booking?</span>
            </div>
            <button
              type="button"
              onClick={() => setIsFormExpanded(true)}
              className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-mono text-[11px] font-bold border border-rose-500/30 transition cursor-pointer text-center"
            >
              Lodge Mediation Ticket
            </button>
          </div>
        ) : (
          // Raise Dispute Form
          <form onSubmit={handleRaiseDispute} className="space-y-4">
            <div className="flex justify-between items-center pb-1 border-b border-slate-900">
              <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-widest">New Mediation Case File</span>
              <button
                type="button"
                onClick={() => setIsFormExpanded(false)}
                className="text-[10px] font-mono text-slate-500 hover:text-slate-300 transition cursor-pointer"
              >
                Cancel Case File
              </button>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/10 p-3.5 rounded-xl text-xs text-rose-300 font-mono leading-normal flex gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <p>
                Warning: Raising a dispute suspends all escrow releases and alerts Kazify arbitration officers. All contract records, milestone dates, and message transcripts will be analyzed.
              </p>
            </div>


          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reason selector */}
            <div>
              <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">REASON FOR DISPUTE</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white"
              >
                <option value="Unsatisfactory Quality of Work">Plumbing / Trades quality unsatisfactory</option>
                <option value="Work Incomplete / Abandoned">Tradesperson abandoned the site</option>
                <option value="Client Payment / Materials Delay">Material delivery delay / payment dispute</option>
                <option value="Contract Breached">Contract terms breach or behavioral issue</option>
                <option value="Other">Other conflicts (detailed below)</option>
              </select>
            </div>

            {/* Estimated work completed slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-orange-400" />
                  Estimated Work Completed
                </label>
                <span className="text-xs font-mono font-bold text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded border border-orange-500/20">{completionPercentage}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={completionPercentage}
                onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="text-[9px] font-mono text-slate-500 mt-1 block">Specify what fraction of the contracted scope is finished.</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block mb-1 text-slate-400">EVIDENTIARY DESCRIPTION</label>
            <textarea
              rows={3}
              placeholder="Provide a detailed explanation of what transpired and the exact resolution you require (e.g. full refund, partial rework)."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-950 border border-slate-800 text-white placeholder:text-slate-600 resize-none"
              required
            />
          </div>

          {/* Quick Preset Evidence Injector */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono font-semibold text-slate-400 block uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              Quick Sandbox Presets (Arbitration Simulator)
            </span>
            <p className="text-[9px] text-slate-500 font-sans leading-tight">
              Don't have photos on hand? Click any of these realistic Kenyan job-site incident scenarios to attach official evidence immediately.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {PRESET_EVIDENCE_EXHIBITS.map((p, idx) => (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleAttachPreset(p)}
                  className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-left cursor-pointer transition flex items-start gap-2 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-950/80 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-800">
                    <img src={p.url} className="w-full h-full object-cover group-hover:scale-110 transition" alt="Preset thumb" referrerPolicy="no-referrer" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <span className="text-[10px] text-slate-200 font-mono font-bold block truncate">{p.name}</span>
                    <span className="text-[8px] text-slate-500 block truncate font-mono">{p.caption.substring(0, 30)}...</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Drag & Drop File Upload Box */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-semibold uppercase tracking-wider block text-slate-400">ATTACH VERIFIED EVIDENCE FILES (PHOTOS / WORK LOGS)</label>
            
            {/* Optional caption before dropping/clicking */}
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Write caption for next file uploaded (e.g. 'Leaking drain pipe beneath kitchen basin')..."
                value={currentCaption}
                onChange={(e) => setCurrentCaption(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 text-xs rounded-xl px-3 py-1.5 font-mono focus:outline-none focus:border-orange-500 text-white placeholder:text-slate-650"
              />
            </div>

            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition flex flex-col items-center justify-center gap-1.5 cursor-pointer relative ${
                dragActive 
                  ? 'border-orange-500 bg-orange-500/10 text-orange-400' 
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 text-slate-400 hover:bg-slate-900/60'
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-orange-400" />
              <div className="text-xs font-mono">
                <span className="font-bold text-white">Drag & drop files here</span> or click to browse local storage
              </div>
              <span className="text-[9px] font-mono text-slate-500">Supports PNG, JPEG, PDF up to 8MB</span>
            </div>
          </div>

          {/* Form attachments list */}
          {attachments.length > 0 && (
            <div className="p-3 bg-slate-900/60 border border-slate-850 rounded-xl space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-slate-950 text-[10px] font-mono text-slate-400">
                <span>EVIDENCE GALLERY READY ({attachments.length})</span>
                <span className="text-orange-400 font-bold">WILL ATTACH ON DISPUTE SUBMISSION</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attachments.map((att) => (
                  <div key={att.id} className="p-2 bg-slate-950 border border-slate-850 rounded-lg flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {att.file_type.startsWith('image/') ? (
                        <div className="w-10 h-10 rounded bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          <img src={att.file_url} className="w-full h-full object-cover" alt="Thumb" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-orange-500/10 text-orange-400 flex-shrink-0 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 text-left font-mono">
                        <span className="text-[10px] text-slate-200 block truncate font-bold">{att.file_name}</span>
                        <span className="text-[9px] text-slate-500 block truncate leading-tight">{att.caption}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="text-rose-400 text-xs font-mono p-2.5 bg-rose-500/5 border border-rose-500/10 rounded-xl">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isRaising}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-rose-500/5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{isRaising ? 'LODGING LEGAL REQUEST...' : 'RAISE DISPUTE'}</span>
          </button>
        </form>
      )) : (
        // Active Dispute Console
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 font-mono text-[10px]">
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase">ARBITRATION STATUS</span>
              <span className={`font-bold block mt-1 uppercase ${
                dispute.status === 'pending' ? 'text-amber-400 animate-pulse' :
                dispute.status.startsWith('resolved') ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                ● {dispute.status.replace('_', ' ')}
              </span>
            </div>
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
              <span className="text-slate-500 block uppercase">LODGED BY</span>
              <span className="font-bold text-white block truncate mt-1">{dispute.initiator_name}</span>
            </div>
          </div>

          {/* Estimated progress status */}
          {dispute.completion_percentage !== undefined && (
            <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl font-mono">
              <div className="flex justify-between items-center text-[10px] mb-1">
                <span className="text-slate-400 font-bold uppercase">Estimated Job Progress Claimed</span>
                <span className="text-orange-400 font-bold">{dispute.completion_percentage}% Done</span>
              </div>
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                <div 
                  className="bg-orange-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${dispute.completion_percentage}%` }}
                />
              </div>
              <span className="text-[8px] text-slate-500 mt-1 block">Arbitrator reviews this percentage relative to funds deposited in the Escrow wallet.</span>
            </div>
          )}

          {/* Dispute Claim statement */}
          <div className="p-3.5 bg-slate-900/50 border border-slate-850 rounded-xl text-xs space-y-1">
            <span className="text-[9px] font-mono font-bold text-orange-400 uppercase tracking-widest block">CLAIM STATEMENT</span>
            <span className="font-bold text-slate-200 block">{dispute.reason}</span>
            <p className="text-slate-400 leading-normal">{dispute.description}</p>
          </div>

          {/* Render Evidence Attachments in Active Console */}
          {dispute.evidence_attachments && dispute.evidence_attachments.length > 0 && (
            <div className="p-3.5 bg-slate-900/30 border border-slate-850 rounded-xl space-y-2 text-xs">
              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest block">EVIDENTIARY ATTACHMENTS ({dispute.evidence_attachments.length})</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dispute.evidence_attachments.map((att) => (
                  <div 
                    key={att.id} 
                    className="p-2 bg-slate-950 border border-slate-900 rounded-xl flex items-center justify-between gap-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {att.file_type?.startsWith('image/') || att.file_url.startsWith('http') ? (
                        <div className="w-10 h-10 rounded bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-800">
                          <img src={att.file_url} className="w-full h-full object-cover" alt="Evidence" referrerPolicy="no-referrer" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded bg-orange-500/15 text-orange-400 flex-shrink-0 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 font-mono text-left text-[10px]">
                        <span className="text-slate-200 block truncate font-bold">{att.file_name}</span>
                        <span className="text-slate-500 block truncate leading-snug">{att.caption || 'Arbitration Exhibit'}</span>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setActiveZoomExhibit(att)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dispute chat log */}
          <div className="border border-slate-850 rounded-xl p-3 bg-slate-950 flex flex-col h-48">
            <span className="text-[9px] font-mono font-bold text-slate-500 uppercase tracking-widest mb-2 block text-center">ARBITRATION CHAT MESSAGES</span>
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 text-xs">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-slate-600 font-mono text-[11px] flex flex-col items-center">
                  <MessageSquare className="w-6 h-6 text-slate-750 mb-1.5" />
                  <span>No dispute entries filed yet. Use chat below to communicate with the administrator.</span>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.sender_id === user.id ? 'items-end' : 'items-start'}`}>
                    <div className={`p-2.5 rounded-xl max-w-[80%] text-left ${m.sender_id === user.id ? 'bg-orange-500 text-slate-950 rounded-tr-none font-medium' : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'}`}>
                      <span className="text-[9px] font-mono block font-bold opacity-60 mb-0.5 uppercase">{m.sender_name}</span>
                      <p className="leading-normal">{m.message}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Send message form */}
          {dispute.status === 'pending' ? (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter message for administrator arbitration review..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-orange-500 font-mono bg-slate-900 border border-slate-800 text-white placeholder:text-slate-650"
                required
              />
              <button
                type="submit"
                disabled={sendingMessage}
                className="p-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 transition active:scale-95 cursor-pointer flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-emerald-400 text-xs font-mono text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4.5 h-4.5" />
              <span>Resolved: {dispute.resolution_summary || 'Case settled by arbitration board.'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
