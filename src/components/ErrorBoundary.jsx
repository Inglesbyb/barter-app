import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { navigate } from '../lib/core';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-md rounded-3xl border border-bad/20 bg-white p-6 shadow-lift text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-bad/10 text-bad mb-4">
            <AlertTriangle size={28} />
          </div>
          <h2 className="font-display text-xl font-bold text-ink">Something went wrong</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {this.state.error?.message || 'An unexpected error occurred while rendering this page.'}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-secondary rounded-xl px-4 py-2.5 text-xs font-semibold"
            >
              <RefreshCw size={14} /> Reload
            </button>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                navigate('/');
              }}
              className="btn-primary rounded-xl px-4 py-2.5 text-xs font-semibold"
            >
              <Home size={14} /> Back to Browse
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
