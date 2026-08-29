import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="text-red-600 dark:text-red-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-4">
              Something Went Wrong
            </h2>
            
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              The application encountered an error. This might be due to:
            </p>
            
            <ul className="text-gray-600 dark:text-gray-400 space-y-2 mb-6 list-disc list-inside">
              <li>Database initialization issues</li>
              <li>Browser storage quota exceeded</li>
              <li>Corrupted local data</li>
              <li>Browser compatibility issues</li>
            </ul>

            <details className="mb-6">
              <summary className="cursor-pointer text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Error Details (for debugging)
              </summary>
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-4 text-sm font-mono overflow-auto max-h-64">
                <p className="text-red-800 dark:text-red-200 font-bold mb-2">
                  {this.state.error?.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="text-red-700 dark:text-red-300 whitespace-pre-wrap text-xs">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            </details>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  // Clear IndexedDB
                  indexedDB.deleteDatabase('NotesDB');
                  setTimeout(() => window.location.reload(), 100);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Clear Data & Reload
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Reload App
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
              If the problem persists, try using a different browser or clearing your browser cache.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
