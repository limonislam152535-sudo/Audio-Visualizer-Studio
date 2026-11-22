'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface FirestoreErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class FirestoreErrorBoundary extends React.Component<
  { children: React.ReactNode },
  FirestoreErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): FirestoreErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected studio error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Studio ErrorBoundary caught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen flex items-center justify-center p-6 studio-ambient-canvas">
          <div className="liquid-glass max-w-md w-full rounded-3xl p-6 space-y-4 shadow-xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6 text-rose-600" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h1 className="font-display text-base font-bold text-slate-900">
                Studio Session Interrupted
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                A workspace error occurred while syncing session data. Your local audio
                never leaves your browser.
              </p>
            </div>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Return to Studio</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
