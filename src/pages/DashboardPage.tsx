import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { evaluateAlerts, getActiveAlerts, markAlertRead, snoozeAlert } from '../services/alert';
import { FinancialAlert } from '../types';
import AlertBanner from '../components/AlertBanner';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    if (!user) return;
    setLoading(true);
    // Evaluate alerts first to ensure fresh data
    await evaluateAlerts(user.uid);
    const result = await getActiveAlerts(user.uid);
    if (result.success && result.data) {
      setAlerts(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    void fetchAlerts();
  }, [user]);

  const handleRead = async (id: string) => {
    if (!user) return;
    const result = await markAlertRead(user.uid, id);
    if (result.success) {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleSnooze = async (id: string) => {
    if (!user) return;
    const result = await snoozeAlert(user.uid, id, 7);
    if (result.success) {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <p>Benvenuto, {user?.email}</p>

      <AlertBanner alerts={alerts} onRead={handleRead} onSnooze={handleSnooze} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Patrimonio Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Patrimonio Netto</h2>
          <p className="text-2xl font-bold mt-2">€ --.---</p>
          <p className="text-green-500 text-sm mt-1">--% rispetto al mese precedente</p>
        </div>

        {/* Raccomandazione Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Raccomandazione</h2>
          <p className="mt-2 text-gray-700 italic">"Calcolo in corso..."</p>
        </div>

        {/* Cedolino Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Ultimo Cedolino</h2>
          <p className="text-xl font-bold mt-2">€ --.--- netti</p>
          <p className="text-gray-500 text-sm">Mese: --/----</p>
        </div>

        {/* PAC Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Investimenti PAC</h2>
          <p className="text-xl font-bold mt-2">€ --.--- investiti</p>
          <p className="text-gray-500 text-sm">-- versamenti totali</p>
        </div>

        {/* Saldo Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Saldo Disponibile</h2>
          <p className="text-xl font-bold mt-2">€ --.---</p>
          <p className="text-gray-500 text-sm">Al netto delle spese ricorrenti</p>
        </div>

        {/* Alert Card (Card 6) */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Alert Recenti</h2>
          <div className="mt-4 space-y-3">
            {loading ? (
              <p className="text-gray-400 text-sm italic">Caricamento...</p>
            ) : alerts.length === 0 ? (
              <p className="text-gray-400 text-sm italic">Nessun alert attivo</p>
            ) : (
              alerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex flex-col border-b border-gray-100 pb-2">
                  <span className={`text-xs font-bold uppercase ${
                    alert.severity === 'critical' ? 'text-red-500' :
                    alert.severity === 'warning' ? 'text-yellow-600' : 'text-blue-500'
                  }`}>
                    {alert.type}
                  </span>
                  <span className="text-sm text-gray-700 truncate">{alert.message}</span>
                </div>
              ))
            )}
            {alerts.length > 3 && (
              <p className="text-xs text-blue-600 cursor-pointer">Vedi tutti ({alerts.length})</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
