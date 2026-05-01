"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import type { ErrorBoundaryState } from "../types/dashboard";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  component?: string;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console in development
    console.error(`ErrorBoundary caught an error in ${this.props.component || "component"}:`, error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === "production") {
      // Example: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-950/50">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-rose-600 dark:text-rose-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-rose-900 dark:text-rose-100">
                {this.props.component ? `${this.props.component} Error` : "Something went wrong"}
              </h3>
              <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">
                {this.props.component 
                  ? `The ${this.props.component} component encountered an error and couldn't render.`
                  : "This component encountered an error and couldn't render."
                }
              </p>
              
              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm font-medium text-rose-800 dark:text-rose-200 hover:text-rose-900 dark:hover:text-rose-100">
                    Error Details (Development Only)
                  </summary>
                  <div className="mt-2 rounded-lg bg-rose-100 p-3 dark:bg-rose-900/30">
                    <p className="text-xs font-mono text-rose-900 dark:text-rose-100">
                      {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <pre className="mt-2 overflow-x-auto text-xs text-rose-800 dark:text-rose-200">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={this.handleReset}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-rose-700 dark:bg-rose-500 dark:hover:bg-rose-600"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-100 dark:border-rose-600 dark:bg-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-900/70"
                >
                  Reload Page
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Specialized error boundaries for specific components
const ChartErrorBoundaryComponent = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary
    component="Chart"
    fallback={
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/50">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Chart temporarily unavailable
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              The sentiment chart couldn't load. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

const FeedErrorBoundaryComponent = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary
    component="Live Feed"
    fallback={
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950/50">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Live feed temporarily unavailable
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Recent tweets couldn't be loaded. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

const KPICardErrorBoundaryComponent = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary
    component="KPI Card"
    fallback={
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/50">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-4 w-4 text-amber-600 dark:text-amber-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
              Metric temporarily unavailable
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              This metric couldn't be calculated.
            </p>
          </div>
        </div>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const ChartErrorBoundary = React.memo(ChartErrorBoundaryComponent);
export const FeedErrorBoundary = React.memo(FeedErrorBoundaryComponent);
export const KPICardErrorBoundary = React.memo(KPICardErrorBoundaryComponent);
