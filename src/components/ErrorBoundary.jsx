// src/components/ErrorBoundary.jsx
import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Ups! NeÅ¡to nije u redu
                </h2>
                <p className="text-sm text-gray-500">
                  Dogodila se neoÄekivana greÅ¡ka
                </p>
              </div>
            </div>
            
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700 mb-2">
                {this.props.fallbackMessage || 'Komponenta se nije mogla uÄitati. Molimo pokuÅ¡ajte ponovo.'}
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-700 font-medium">
                    ðŸ“‹ TehniÄki detalji (dev mode)
                  </summary>
                  <pre className="mt-3 text-xs bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-48">
{this.state.error.toString()}

Stack trace:
{this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                OsvjeÅ¾i stranicu
              </button>
              
              {this.props.onReset && (
                <button
                  onClick={() => {
                    this.setState({ hasError: false, error: null, errorInfo: null });
                    this.props.onReset();
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all"
                >
                  <Home className="w-4 h-4" />
                  PoÄetna
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

