import React, { useState } from 'react';
import { AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react';

interface GeminiErrorFallbackProps {
  error: string;
  jobTitle: string;
  jobDescription: string;
  jobCategory: string;
  jobLocation: string;
  onRetry: () => void;
}

export const GeminiErrorFallback: React.FC<GeminiErrorFallbackProps> = ({
  error,
  jobTitle,
  jobDescription,
  jobCategory,
  jobLocation,
  onRetry
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `Job Title: ${jobTitle}\nCategory: ${jobCategory}\nLocation: ${jobLocation || 'Kenya'}\nDescription: ${jobDescription}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  return (
    <div className="bg-red-950/20 border border-red-500/25 text-red-200 p-4 rounded-xl space-y-4 my-2 animate-fadeIn" id="gemini-error-fallback-container">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" id="gemini-error-icon" />
        <div className="space-y-1">
          <p className="font-semibold font-mono text-[10px] uppercase tracking-wider text-red-400" id="gemini-error-title">
            Estimation Service Interrupted
          </p>
          <p className="text-[11px] text-slate-300 leading-relaxed" id="gemini-error-message">
            {error === 'Service Temporarily Unavailable' 
              ? 'The response received from the estimation service is invalid or incomplete. Please try again or check your inputs.'
              : error}
          </p>
        </div>
      </div>

      <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/50 space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Your Inputs</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 hover:text-emerald-300 transition cursor-pointer"
            id="gemini-copy-inputs-btn"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span>COPIED!</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>COPY INPUTS</span>
              </>
            )}
          </button>
        </div>
        <div className="text-[10px] text-slate-300 space-y-1">
          <p><strong className="text-slate-400">Title:</strong> {jobTitle || 'N/A'}</p>
          <p><strong className="text-slate-400">Category:</strong> {jobCategory || 'N/A'}</p>
          {jobLocation && <p><strong className="text-slate-400">Location:</strong> {jobLocation}</p>}
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          type="button"
          onClick={onRetry}
          className="flex-1 py-2 px-4 bg-red-500/20 hover:bg-red-500/35 border border-red-500/40 text-red-300 hover:text-white text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 font-mono cursor-pointer"
          id="gemini-retry-btn"
        >
          <RefreshCw className="w-3.5 h-3.5 animate-spin-reverse" />
          <span>RETRY ESTIMATION</span>
        </button>
      </div>
    </div>
  );
};
