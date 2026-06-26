import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LifeBuoy } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[GlobalErrorBoundary caught crash]:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div 
          className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6"
          id="global-error-boundary-view"
        >
          <div className="w-full max-w-md bg-slate-900 border border-red-500/30 p-6 rounded-2xl space-y-6 shadow-2xl shadow-red-500/5 animate-fadeIn">
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="p-3 bg-red-500/10 rounded-2xl text-red-400 shrink-0 border border-red-500/20">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-sm font-mono font-bold text-red-400 uppercase tracking-widest">
                  Application Error Detected
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                  Kazify encountered an unexpected runtime failure. The system has logged the diagnostic incident details.
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">Diagnostic Log:</span>
                <pre className="text-[9px] font-mono bg-slate-950 p-3 rounded-xl text-slate-400 max-h-24 overflow-y-auto border border-slate-800 leading-normal select-all">
                  {this.state.error.name}: {this.state.error.message}
                </pre>
              </div>
            )}

            <div className="flex flex-col space-y-2.5 pt-1">
              <button
                type="button"
                onClick={this.handleReload}
                aria-label="Reload the application"
                className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-400 text-slate-950 text-xs font-bold font-mono uppercase rounded-xl transition-all flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20 active:translate-y-0.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                id="global-boundary-reload-btn"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload App</span>
              </button>

              <a
                href="mailto:houseventuresconsultancy@gmail.com?subject=Kazify%20App%20Crash%20Report"
                aria-label="Contact support team via email"
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold font-mono uppercase rounded-xl transition flex items-center justify-center space-x-2 border border-slate-700/80 cursor-pointer focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus:outline-none"
                id="global-boundary-support-link"
              >
                <LifeBuoy className="w-4 h-4 text-orange-400" />
                <span>Contact Support</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
