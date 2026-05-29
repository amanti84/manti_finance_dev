import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { evaluateAlerts, getActiveAlerts, markAlertRead, snoozeAlert } from '../services/alert';
import type { FinancialAlert } from '../types';
import AlertBanner from '../components/AlertBanner';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    // Evaluate alerts first to ensure fresh data
    await evaluateAlerts(user.uid);
    const result = await getActiveAlerts(user.uid);
    if (result.success && result.data) {
      setAlerts(result.data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

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

      <AlertBanner
        alerts={alerts}
        onRead={(id) => { void handleRead(id); }}
        onSnooze={(id) => { void handleSnooze(id); }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Patrimonio Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Patrimonio Netto</h2>
          <p className="text-2xl font-bold mt-2">&euro; --.---</p>
          <p className="text-green-500 text-sm mt-1">--% rispetto al mese precedente</p>
        </div>

        {/* Raccomandazione Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Raccomandazione</h2>
          <p className="mt-2 text-gray-700 italic">&quot;Calcolo in corso...&quot;</p>
        </div>

        {/* Cedolino Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Ultimo Cedolino</h2>
          <p className="text-2xl font-bold mt-2">&euro; --.--- netti</p>
          <p className="text-gray-500 text-sm mt-1">Mese: --/----</p>
        </div>

        {/* PAC Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Investimenti PAC</h2>
          <p className="text-2xl font-bold mt-2">&euro; --.--- investiti</p>
          <p className="text-gray-500 text-sm mt-1">-- versamenti totali</p>
        </div>

        {/* Saldo Card */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Saldo Disponibile</h2>
          <p className="text-2xl font-bold mt-2">&euro; --.---</p>
          <p className="text-gray-500 text-sm mt-1">Al netto delle spese ricorrenti</p>
        </div>

        {/* Alert Card (Card 6) */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h2 className="text-gray-500 text-sm font-medium uppercase">Alert Recenti</h2>
          {loading ? (
            <p className="mt-2 text-gray-500">Caricamento...</p>
          ) : alerts.length === 0 ? (
            <p className="mt-2 text-gray-500">Nessun alert attivo</p>
          ) : (
            alerts.slice(0, 3).map(alert => (
              <div key={alert.id} className="mt-2">
                <span className="font-medium">{alert.type}</span>&nbsp;&nbsp;
                <span className="text-gray-600">{alert.message}</span>
              </div>
            ))
          )}
          {alerts.length > 3 && (
            <p className="mt-2 text-blue-500 text-sm">Vedi tutti ({alerts.length})</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
