import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { markAlertRead, snoozeAlert, evaluateAlerts } from '../../services/alert';
import type { FinancialAlert, AlertSeverity } from '../../types';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

const AlertsPage: React.FC = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<'active' | 'read' | 'snoozed' | 'all'>('active');

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      // For the AlertsPage, we might want to see ALL alerts, not just active ones
      const colRef = collection(db, `users/${user.uid}/alerts`);
      const q = query(colRef, orderBy('createdAt', 'desc'));

      const snap = await getDocs(q);
      const allAlerts = snap.docs.map(d => ({ id: d.id, ...d.data() }) as FinancialAlert);

      setAlerts(allAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const handleRead = async (id: string) => {
    if (!user) return;
    const result = await markAlertRead(user.uid, id);
    if (result.success) {
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, read: true } : a));
    }
  };

  const handleSnooze = async (id: string) => {
    if (!user) return;
    const result = await snoozeAlert(user.uid, id, 7);
    if (result.success) {
      void fetchAlerts(); // Refresh to get updated snooze dates
    }
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/alerts`, id));
      setAlerts(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const handleEvaluate = async () => {
    if (!user) return;
    setLoading(true);
    await evaluateAlerts(user.uid);
    void fetchAlerts();
  };

  const [now] = useState(() => Date.now());
  const filteredAlerts = alerts.filter((a) => {
    const severityMatch = filterSeverity === 'all' || a.severity === filterSeverity;
    let statusMatch = true;
    if (filterStatus === 'active') {
      statusMatch = !a.read && (!a.snoozedUntil || a.snoozedUntil.toMillis() < now);
    } else if (filterStatus === 'read') {
      statusMatch = a.read;
    } else if (filterStatus === 'snoozed') {
      statusMatch = !a.read && a.snoozedUntil !== undefined && a.snoozedUntil.toMillis() >= now;
    }
    return severityMatch && statusMatch;
  });

  const getSeverityBadgeColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Alert Finanziari</h1>
        <button
          onClick={() => { void handleEvaluate(); }}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm"
        >
          Aggiorna Alert
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Severità</label>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value as AlertSeverity | 'all')}
            className="border border-gray-300 rounded p-1 text-sm"
          >
            <option value="all">Tutte</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Stato</label>
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as 'active' | 'read' | 'snoozed' | 'all')
            }
            className="border border-gray-300 rounded p-1 text-sm"
          >
            <option value="active">Attivi</option>
            <option value="read">Letti</option>
            <option value="snoozed">In Snooze</option>
            <option value="all">Tutti</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg p-12 text-center">
          <p className="text-gray-500">Nessun alert trovato per i filtri selezionati.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAlerts.map(alert => (
            <div key={alert.id} className={`p-4 rounded-lg border ${alert.read ? 'bg-gray-50 border-gray-200' : 'bg-white border-blue-200 shadow-sm'}`}>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${getSeverityBadgeColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="text-xs text-gray-500">
                    {alert.createdAt?.toDate().toLocaleDateString('it-IT')} {alert.createdAt?.toDate().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex space-x-2">
                  {!alert.read && (
                    <>
                      <button
                        onClick={() => { void handleRead(alert.id); }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Segna come letto
                      </button>
                      <button
                        onClick={() => { void handleSnooze(alert.id); }}
                        className="text-xs text-gray-600 hover:underline"
                      >
                        Snooze 7gg
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => { void handleDelete(alert.id); }}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Elimina
                  </button>
                </div>
              </div>
              <p className={`text-sm ${alert.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                {alert.message}
              </p>
              {alert.snoozedUntil && alert.snoozedUntil.toMillis() >= now && (
                <p className="text-xs text-orange-600 mt-2 font-medium">
                  In snooze fino al {alert.snoozedUntil.toDate().toLocaleDateString('it-IT')}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertsPage;
