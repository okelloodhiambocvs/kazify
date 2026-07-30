import React from 'react';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { User } from '../../types';
import { useDisputePanel } from '../../hooks/disputes/useDisputePanel';
import { DisputeEvidenceModal } from './DisputeEvidenceModal';
import { RaiseDisputeForm } from './RaiseDisputeForm';
import { ActiveDisputeConsole } from './ActiveDisputeConsole';

export interface DisputePanelProps {
  jobId: string;
  user: User;
  onStateChanged?: () => void;
}

export default function DisputePanel({ jobId, user, onStateChanged }: DisputePanelProps) {
  const {
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
  } = useDisputePanel({ jobId, user, onStateChanged });

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
      <DisputeEvidenceModal
        activeZoomExhibit={activeZoomExhibit}
        onClose={() => setActiveZoomExhibit(null)}
      />

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
          <RaiseDisputeForm
            reason={reason}
            setReason={setReason}
            description={description}
            setDescription={setDescription}
            completionPercentage={completionPercentage}
            setCompletionPercentage={setCompletionPercentage}
            attachments={attachments}
            isRaising={isRaising}
            error={error}
            setIsFormExpanded={setIsFormExpanded}
            currentCaption={currentCaption}
            setCurrentCaption={setCurrentCaption}
            dragActive={dragActive}
            handleDrag={handleDrag}
            handleDrop={handleDrop}
            handleFileChange={handleFileChange}
            handleAttachPreset={handleAttachPreset}
            removeAttachment={removeAttachment}
            handleRaiseDispute={handleRaiseDispute}
          />
        )
      ) : (
        <ActiveDisputeConsole
          dispute={dispute}
          user={user}
          messages={messages}
          messagesEndRef={messagesEndRef}
          setActiveZoomExhibit={setActiveZoomExhibit}
          newMessage={newMessage}
          setNewMessage={setNewMessage}
          sendingMessage={sendingMessage}
          handleSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
}
