import React from 'react';
import { FinancialAlert } from '../types';

interface AlertBannerProps {
  alerts: FinancialAlert[];
  onRead: (id: string) => void;
  onSnooze: (id: string) => void;
}

const AlertBanner: React.FC<AlertBannerProps> = ({ alerts, onRead, onSnooze }) => {
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  if (criticalAlerts.length === 0) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">
            Hai {criticalAlerts.length} alert critici che richiedono attenzione.
          </p>
          <div className="mt-2 space-y-2">
            {criticalAlerts.map(alert => (
              <div key={alert.id} className="flex items-center justify-between bg-white bg-opacity-50 p-2 rounded">
                <span className="text-sm font-medium text-red-800">{alert.message}</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onRead(alert.id!)}
                    className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded hover:bg-red-200"
                  >
                    Letto
                  </button>
                  <button
                    onClick={() => onSnooze(alert.id!)}
                    className="text-xs bg-white text-red-800 px-2 py-1 rounded border border-red-200 hover:bg-gray-50"
                  >
                    Snooze 7gg
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertBanner;
