import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';

interface ErrorCardProps {
  message: string;
  onRetry?: (() => void) | undefined;
  compact?: boolean;
  className?: string;
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  message,
  onRetry,
  compact = false,
  className = '',
}) => {
  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg border border-error/20 bg-error/5 ${className}`}>
        <div className="text-error shrink-0">
          <AlertCircle size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text truncate" title={message}>
            {message}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-error hover:text-error/80 transition-colors shrink-0"
            aria-label="Riprova"
          >
            <RefreshCcw size={16} />
          </button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-error/20 bg-error/5 ${className}`}>
      <div className="flex flex-col items-center text-center space-y-3 p-4">
        <div className="p-2 rounded-full bg-error/10 text-error">
          <AlertCircle size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-text">Errore di caricamento</h4>
          <p className="text-xs text-text-muted">{message}</p>
        </div>
        {onRetry && (
          <Button
            size="sm"
            variant="ghost"
            className="text-error hover:bg-error/10"
            onClick={onRetry}
            leftIcon={<RefreshCcw size={14} />}
          >
            Riprova
          </Button>
        )}
      </div>
    </Card>
  );
};
