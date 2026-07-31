'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled error boundary exception', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 p-8 text-slate-100">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 text-center">
            <h1 className="text-2xl font-semibold">Something went wrong.</h1>
            <p className="mt-3 text-slate-400">The application could not render this view.</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
