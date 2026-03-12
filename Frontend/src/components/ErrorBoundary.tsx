import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-white/30 backdrop-blur-xl rounded-[3rem] border border-white/50 m-6 shadow-2xl">
          <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-6 animate-bounce">
            <AlertTriangle size={40} className="text-red-600" />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 uppercase mb-4 tracking-tighter">
            System Deflection Detected
          </h1>
          
          <p className="max-w-md text-slate-600 font-medium leading-relaxed mb-8">
            The intelligence interface encountered a critical telemetry mismatch. This usually happens during high-frequency live data updates.
          </p>

          <div className="p-4 bg-black/5 rounded-2xl mb-8 w-full max-w-lg overflow-hidden">
            <code className="text-xs text-red-700 font-mono break-all line-clamp-2">
              {this.state.error?.toString()}
            </code>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-sm hover:bg-blue-700 transition-all shadow-lg hover:-translate-y-1"
            >
              <RefreshCcw size={18} /> Re-sync Dashboard
            </button>
            <a
              href="/"
              className="flex items-center gap-2 px-8 py-4 bg-white/80 text-slate-800 rounded-2xl font-black uppercase text-sm hover:bg-white transition-all border border-slate-200 shadow-sm"
            >
              <Home size={18} /> Return to Login
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
