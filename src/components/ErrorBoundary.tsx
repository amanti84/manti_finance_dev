import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { logAudit } from '../services/audit';
import { auth } from '../firebase';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface FallbackProps {
  error: Error;
  retry: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<FallbackProps>;
  moduleName?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { moduleName = 'App' } = this.props;

    // Logging to console
    console.error(`ErrorBoundary caught an error in module [${moduleName}]:`, error, errorInfo);

    // Logging to Audit Service
    const uid = auth.currentUser?.uid;
    if (uid) {
      void logAudit({
        uid,
        action: 'sistema',
        entityType: 'config', // 'sistema' doesn't have a specific entityType, using 'config' as a generic one
        entityId: moduleName,
        newValue: {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        },
        source: 'system',
      });
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const { fallback: FallbackComponent, moduleName = 'Modulo' } = this.props;

      if (FallbackComponent) {
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      return (
        <div className="flex items-center justify-center min-h-[400px] p-6 w-full">
          <Card className="max-w-md w-full border-error/20 bg-error/5">
            <div className="flex flex-col items-center text-center space-y-4 p-4">
              <div className="p-3 rounded-full bg-error/10 text-error">
                <AlertCircle size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-text">Si è verificato un errore</h3>
                <p className="text-sm text-text-muted">
                  Si è verificato un problema imprevisto nel modulo <strong>{moduleName}</strong>.
                </p>
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-surface text-left rounded border border-border overflow-auto max-h-40">
                    <code className="text-xs text-error">{this.state.error.message}</code>
                  </div>
                )}
              </div>
              <Button
                variant="primary"
                onClick={this.handleRetry}
                leftIcon={<RefreshCcw size={16} />}
              >
                Riprova
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
