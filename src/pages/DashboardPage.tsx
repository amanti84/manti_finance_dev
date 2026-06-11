import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { evaluateAlerts, getActiveAlerts, markAlertRead, snoozeAlert } from '../services/alert';
import type { FinancialAlert, Payslip } from '../types';
import AlertBanner from '../components/AlertBanner';
import { DecisionWidget } from '../modules/decisionEngine';
import { GoalWidget } from '../modules/goals';
import {
  Card,
  Skeleton,
  EmptyState,
  Button,
  Badge
} from '../components/ui';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PiggyBank,
  Receipt,
  BarChart3,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '../utils/format';
import { getPayslips } from '../services/payroll';
import { getAllPacPayments } from '../services/pac';
import { getAllInvestments } from '../services/investment';
import { getAccounts, getRecurringExpenses } from '../services/cashflow';
import { getMutuoConfig } from '../services/mutuo';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<FinancialAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);

  const [payslipData, setPayslipData] = useState<{ last: Payslip; trend: number | undefined } | null>(null);
  const [payslipLoading, setPayslipLoading] = useState(true);

  const [pacData, setPacData] = useState<{ totalInvested: number; count: number } | null>(null);
  const [pacLoading, setPacLoading] = useState(true);

  const [cashflowData, setCashflowData] = useState<{ available: number } | null>(null);
  const [cashflowLoading, setCashflowLoading] = useState(true);

  const [netWorthData, setNetWorthData] = useState<{ total: number; isPartial: boolean } | null>(null);
  const [netWorthLoading, setNetWorthLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;
    setAlertsLoading(true);
    await evaluateAlerts(user.uid);
    const result = await getActiveAlerts(user.uid);
    if (result.success && result.data) {
      setAlerts(result.data);
    }
    setAlertsLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!user) return;

    const fetchPayslips = async () => {
      setPayslipLoading(true);
      const res = await getPayslips(user.uid);
      if (res.success && res.data && res.data.length > 0) {
        const sorted = res.data;
        const last = sorted[0];
        let trend: number | undefined;
        if (sorted.length > 1) {
          const prev = sorted[1];
          if (prev.netSalary > 0) {
            trend = ((last.netSalary - prev.netSalary) / prev.netSalary) * 100;
          }
        }
        setPayslipData({ last, trend });
      } else {
        setPayslipData(null);
      }
      setPayslipLoading(false);
    };

    // Card PAC: totale versato = somma importo da PacPayment
    // Fonte: getAllPacPayments — riflette i versamenti effettivi registrati
    const fetchPac = async () => {
      setPacLoading(true);
      const res = await getAllPacPayments(user.uid);
      if (res.success && res.data && res.data.length > 0) {
        const totalInvested = res.data.reduce((sum, p) => sum + p.importo, 0);
        setPacData({ totalInvested, count: res.data.length });
      } else {
        setPacData(null);
      }
      setPacLoading(false);
    };

    const fetchCashflow = async () => {
      setCashflowLoading(true);
      const [accRes, expRes] = await Promise.all([
        getAccounts(user.uid),
        getRecurringExpenses(user.uid)
      ]);
      if (accRes.success && accRes.data && accRes.data.length > 0) {
        const totalBalance = accRes.data.reduce((sum, acc) => sum + acc.currentBalance, 0);
        let monthlyExpenses = 0;
        if (expRes.success && expRes.data) {
          monthlyExpenses = expRes.data.reduce((sum, exp) => {
            if (exp.frequency === 'monthly') return sum + exp.amount;
            if (exp.frequency === 'quarterly') return sum + exp.amount / 3;
            if (exp.frequency === 'annual') return sum + exp.amount / 12;
            return sum;
          }, 0);
        }
        setCashflowData({ available: totalBalance - monthlyExpenses });
      } else {
        setCashflowData(null);
      }
      setCashflowLoading(false);
    };

    const fetchNetWorth = async () => {
      setNetWorthLoading(true);
      const [accRes, invRes, mutuoRes] = await Promise.all([
        getAccounts(user.uid),
        getAllInvestments(user.uid),
        getMutuoConfig(user.uid)
      ]);
      let total = 0;
      let isPartial = false;
      let hasAnyData = false;

      if (accRes.success && accRes.data && accRes.data.length > 0) {
        total += accRes.data.reduce((sum, acc) => sum + acc.currentBalance, 0);
        hasAnyData = true;
      } else if (!accRes.success) {
        isPartial = true;
      }

      if (invRes.success && invRes.data && invRes.data.length > 0) {
        total += invRes.data.reduce((sum, inv) => sum + inv.currentValue, 0);
        hasAnyData = true;
      } else if (!invRes.success) {
        isPartial = true;
      }

      if (mutuoRes.success && mutuoRes.data) {
        total -= mutuoRes.data.debitoResiduo;
        hasAnyData = true;
      } else if (mutuoRes.error && mutuoRes.error !== 'Configurazione mutuo non trovata') {
        isPartial = true;
      }

      if (hasAnyData || isPartial) {
        setNetWorthData({ total, isPartial });
      } else {
        setNetWorthData(null);
      }
      setNetWorthLoading(false);
    };

    void fetchPayslips();
    void fetchPac();
    void fetchCashflow();
    void fetchNetWorth();
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

  const renderTrend = (trend?: number) => {
    if (trend === undefined) return null;
    const isPositive = trend >= 0;
    return (
      <div className={`flex items-center gap-1 text-xs font-medium ${isPositive ? 'text-success' : 'text-error'}`}>
        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        {Math.abs(trend).toFixed(1)}% rispetto al mese precedente
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text">Dashboard</h1>
          <p className="text-text-muted mt-1">Benvenuto, {user?.email}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => navigate('/inbox')}>
            Inbox
          </Button>
          <Button size="sm" onClick={() => navigate('/payroll')}>
            Aggiungi Cedolino
          </Button>
        </div>
      </header>

      <AlertBanner
        alerts={alerts}
        onRead={(id) => { void handleRead(id); }}
        onSnooze={(id) => { void handleSnooze(id); }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Patrimonio Netto */}
        <Card
          title="Patrimonio Netto"
          actions={<BarChart3 size={20} className="text-text-muted" />}
          footer={
            netWorthData?.isPartial && (
              <Badge variant="warning" size="sm" className="w-full justify-center">
                <AlertCircle size={12} className="mr-1" /> Dati parziali
              </Badge>
            )
          }
        >
          {netWorthLoading ? (
            <div className="space-y-2">
              <Skeleton variant="heading" width="80%" />
              <Skeleton variant="text" width="60%" />
            </div>
          ) : !netWorthData ? (
            <EmptyState
              title="Nessun dato"
              className="p-0 py-2"
              action={{ label: 'Configura', onClick: () => navigate('/cashflow') }}
            />
          ) : (
            <div className="space-y-1">
              <div className="text-2xl font-bold tracking-tight" data-testid="net-worth-value">
                {formatCurrency(netWorthData.total)}
              </div>
              <p className="text-xs text-text-muted">Aggregato da conti, investimenti e mutuo</p>
            </div>
          )}
        </Card>

        {/* Ultimo Cedolino */}
        <Card
          title="Ultimo Cedolino"
          actions={<Receipt size={20} className="text-text-muted" />}
        >
          {payslipLoading ? (
            <div className="space-y-2">
              <Skeleton variant="heading" width="80%" />
              <Skeleton variant="text" width="60%" />
            </div>
          ) : !payslipData ? (
            <EmptyState
              title="Nessun cedolino"
              className="p-0 py-2 text-xs"
              action={{ label: 'Carica', onClick: () => navigate('/payroll') }}
            />
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-bold tracking-tight" data-testid="last-payslip-value">
                {formatCurrency(payslipData.last.netSalary)}
                <span className="text-sm font-normal text-text-muted ml-1">netti</span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="text-xs text-text-muted">
                  Riferimento: {payslipData.last.month}/{payslipData.last.year}
                </div>
                {renderTrend(payslipData.trend)}
              </div>
            </div>
          )}
        </Card>

        {/* Investimenti PAC */}
        <Card
          title="Investimenti PAC"
          actions={<PiggyBank size={20} className="text-text-muted" />}
        >
          {pacLoading ? (
            <div className="space-y-2">
              <Skeleton variant="heading" width="80%" />
              <Skeleton variant="text" width="60%" />
            </div>
          ) : !pacData ? (
            <EmptyState
              title="Nessun PAC"
              className="p-0 py-2 text-xs"
              action={{ label: 'Inizia', onClick: () => navigate('/investimenti/pac') }}
            />
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-bold tracking-tight" data-testid="pac-total-value">
                {formatCurrency(pacData.totalInvested)}
              </div>
              <div className="text-xs text-text-muted">
                {pacData.count} {pacData.count === 1 ? 'versamento registrato' : 'versamenti registrati'}
              </div>
            </div>
          )}
        </Card>

        {/* Saldo Disponibile */}
        <Card
          title="Saldo Disponibile"
          actions={<Wallet size={20} className="text-text-muted" />}
        >
          {cashflowLoading ? (
            <div className="space-y-2">
              <Skeleton variant="heading" width="80%" />
              <Skeleton variant="text" width="60%" />
            </div>
          ) : !cashflowData ? (
            <EmptyState
              title="Nessun conto"
              className="p-0 py-2 text-xs"
              action={{ label: 'Aggiungi', onClick: () => navigate('/cashflow') }}
            />
          ) : (
            <div className="space-y-2">
              <div className="text-2xl font-bold tracking-tight" data-testid="available-balance-value">
                {formatCurrency(cashflowData.available)}
              </div>
              <div className="text-xs text-text-muted">
                Al netto delle spese ricorrenti mensili
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Raccomandazione di Allocazione</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/decision-engine')} rightIcon={<ArrowRight size={16} />}>
              Dettagli
            </Button>
          </div>
          {user && <DecisionWidget uid={user.uid} />}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight">Obiettivi Finanziari</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/goals')} rightIcon={<ArrowRight size={16} />}>
              Vedi tutti
            </Button>
          </div>
          {user && <GoalWidget uid={user.uid} />}
        </section>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-text">Alert Recenti</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')} rightIcon={<ArrowRight size={16} />}>
            Gestisci Alert
          </Button>
        </div>
        <Card className="p-0 overflow-hidden">
          {alertsLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton variant="text" />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
            </div>
          ) : alerts.length === 0 ? (
            <EmptyState
              title="Tutto sotto controllo"
              description="Non ci sono alert attivi al momento."
              icon={<TrendingUp className="text-success" size={40} />}
            />
          ) : (
            <div className="divide-y divide-border">
              {alerts.slice(0, 5).map(alert => (
                <div key={alert.id} className="p-4 flex items-center justify-between hover:bg-surface-offset transition-colors">
                  <div className="flex items-center gap-3">
                    <Badge variant={alert.severity === 'critical' ? 'error' : alert.severity === 'warning' ? 'warning' : 'info'}>
                      {(alert.type ?? '').replace(/_/g, ' ')}
                    </Badge>
                    <span className="text-sm font-medium text-text">{alert.message}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => { void handleRead(alert.id); }}>
                      Segna come letto
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
};

export default DashboardPage;
