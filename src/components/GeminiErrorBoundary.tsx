import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, LifeBuoy, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onHelpTriggered?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GeminiErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GeminiErrorBoundary caught crash]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div 
          className="bg-slate-900 border border-red-500/30 p-5 rounded-2xl space-y-4 my-2 animate-fadeIn"
          id="gemini-error-boundary-view"
        >
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-red-500/10 rounded-xl text-red-400 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-mono font-bold text-red-400 uppercase tracking-wider">
                Service Temporarily Unavailable
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                An unexpected component error occurred while rendering the pricing estimator. Our team has been notified.
              </p>
              {this.state.error && (
                <pre className="text-[9px] font-mono bg-slate-950 p-2 rounded-lg text-slate-400 max-h-20 overflow-y-auto border border-slate-800">
                  {this.state.error.message}
                </pre>
              )}
            </div>
          </div>

          <div className="flex space-x-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 border border-slate-700 font-mono cursor-pointer"
              id="boundary-retry-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>RECOVER INTERFACE</span>
            </button>

            <button
              type="button"
              onClick={this.props.onHelpTriggered}
              className="py-2 px-3 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-semibold rounded-xl transition flex items-center justify-center space-x-2 border border-orange-500/30 font-mono cursor-pointer"
              id="boundary-help-btn"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>GET HELP</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
